var config = {
    // You can get these from: https://console.firebase.google.com
    "googleApiKey" :  "",
    "GoogleClientID" : "",

    // https://firebase.google.com/docs/firestore/use-rest-api#making_rest_calls
    "databasePath" : "projects/$PROJECTID$/databases/(default)/documents/resources/",
}



function authenticate() {
  // Enable execute button
  document.getElementById("btnExecute").disabled = false;
  document.getElementById("btnExecute").style = "";

  // Login with google Auth
  return gapi.auth2
    .getAuthInstance()
    .signIn({
      scope:
        "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore",
    })
    .then(
      function () {
        console.log("Sign-in successful");
      },
      function (err) {
        console.error("Error signing in", err);
      }
    );
}

// Load Google Client API
function loadClient() {
  gapi.client.setApiKey(config.googleApiKey);
  return gapi.client
    .load("https://firestore.googleapis.com/$discovery/rest?version=v1beta1")
    .then(
      function () {
        console.log("GAPI client loaded for API");
      },
      function (err) {
        console.error("Error loading GAPI client for API", err);
      }
    );
}

// Traverse nodes in firstore with depth first traversal
var depthFirstTraversal = async function (current) {
  // Get children from firestore
  var response = await gapi.client.firestore.projects.databases.documents.get({
    name: current.name + "/children/",
  });

  // Add children to current node
  current.children = response.result.documents;

  // Display current node
  console.log("Visiting ", current);

  // Form tree
  update(current);

  // Visit children of current node
  for (var ck in current.children) {
    var child = current.children[ck];
    console.log("currentChildren", child);
    depthFirstTraversal(child);
  }
};

// Make sure the client is loaded and sign-in is complete before calling this method.
async function execute() {
  gapi.client.firestore.projects.databases.documents
    .get({
      name:
        config.databasePath,
    })
    .then(
      function (response) {
        if (response.body === "{}\n") {
          return;
        } else {
          // Create Root
          tree_data = response.result.documents[0];

          root = tree_data;
          root.x0 = tree_height / 2;
          root.y0 = 0;

          console.log("Root", root);

          // Get children
          depthFirstTraversal(root);
        }
      },
      function (err) {
        console.error("Execute error", err);
      }
    );
}

gapi.load("client:auth2", function () {
  gapi.auth2.init({
    client_id:
      config.GoogleClientID,
  });
});

var margin = { top: 20, right: 120, bottom: 20, left: 120 },
  canvas_height = 700,
  canvas_width = 960;
(tree_width = canvas_width - margin.right - margin.left),
  (tree_height = canvas_height - margin.top - margin.bottom),
  (tree_level_depth = 180);

var i = 0,
  duration = 750,
  root;

var tree = d3.layout.tree().size([tree_height, tree_width]);

var diagonal = d3.svg.diagonal().projection(function (d) {
  return [d.y, d.x];
});

var svg = d3
  .select(".graph")
  .append("svg")
  .attr("width", canvas_width)
  .attr("height", canvas_height)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.select(self.frameElement).style("height", "800px");

function update(source) {
  // Compute the new tree layout.
  var nodes = tree.nodes(root),
    links = tree.links(nodes);

  // Normalize for fixed-depth.
  nodes.forEach(function (d) {
    d.y = d.depth * tree_level_depth;
  });

  // Set unique ID for each node
  var node = svg.selectAll("g.node").data(nodes, function (d) {
    return d.id || (d.id = ++i);
  });

  // Enter any new nodes at the parent's previous position.
  var new_nodes = node
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", function (d) {
      return "translate(" + source.y0 + "," + source.x0 + ")";
    })
    .on("click", click);

  new_nodes
    .append("circle")
    .attr("r", 1e-6)
    .style("fill", function (d) {
      return d._children ? "lightsteelblue" : "#fff";
    });

  new_nodes
    .append("text")
    .attr("x", function (d) {
      return d.children || d._children ? -10 : 10;
    })
    .attr("dy", ".35em")
    .attr("text-anchor", function (d) {
      return d.children || d._children ? "end" : "start";
    })
    .text(function (d) {
      return d.fields.name.stringValue;
    })
    .style("fill-opacity", 1e-6);

  new_nodes
    .append("a")
    .attr("xlink:href", function (d) {
      if (d.fields.link === undefined) {
        return "";
      } else {
        return d.fields.link.stringValue;
      }
    })
    .append("text")
    .attr("class", "clickable")
    .attr("y", 16)
    .attr("x", function (d) {
      return d.children || d._children ? -10 : 10;
    })
    .attr("text-anchor", function (d) {
      return d.children || d._children ? "end" : "start";
    })
    .text(function (d) {
      if (d.fields.link === undefined) {
        return "";
      } else {
        var text = d.fields.link.stringValue;
        if (text.length > 15) {
          return text.substring(0, 15).concat("...");
        } else {
          return text;
        }
      }
    });

  // Transition nodes to their new position.
  var moved_node = node
    .transition()
    .duration(duration)
    .attr("transform", function (d) {
      return "translate(" + d.y + "," + d.x + ")";
    });
  moved_node
    .select("circle")
    .attr("r", 4.5)
    .style("fill", function (d) {
      return d._children ? "lightsteelblue" : "#fff";
    });
  moved_node.select("text").style("fill-opacity", 1);

  // Transition exiting nodes to the parent's new position.
  var hidden_nodes = node
    .exit()
    .transition()
    .duration(duration)
    .attr("transform", function (d) {
      return "translate(" + source.y + "," + source.x + ")";
    })
    .remove();
  hidden_nodes.select("circle").attr("r", 1e-6);
  hidden_nodes.select("text").style("fill-opacity", 1e-6);

  // Update the links…
  var link = svg.selectAll("path.link").data(links, function (d) {
    return d.target.id;
  });

  // Enter any new links at the parent's previous position.
  link
    .enter()
    .insert("path", "g")
    .attr("class", "link")
    .attr("d", function (d) {
      var o = { x: source.x0, y: source.y0 };
      return diagonal({ source: o, target: o });
    })
    .append("svg:title")
    .text(function (d, i) {
      return d.target.edge_name;
    });

  //Transition links to their new position.
  link.transition().duration(duration).attr("d", diagonal);

  // Transition exiting nodes to the parent's new position.
  link
    .exit()
    .transition()
    .duration(duration)
    .attr("d", function (d) {
      var o = { x: source.x, y: source.y };
      return diagonal({ source: o, target: o });
    })
    .remove();

  // Stash the old positions for transition.
  nodes.forEach(function (d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });
}

// Toggle children on click.
function click(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  update(d);
}
