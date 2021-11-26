
async function fetchObjectJSON(uri){
  let ret = await fetch(uri);
  ret = await ret.text();
  ret = await JSON.parse(ret);
  return ret;
}

function toggleLayer(layerName, viewer) {
  var root = viewer.impl.getLayersRoot();

  if (root == null) {
      console.log("No layer information...");
      return;
  }

  var toggleLayerSub = function(layer, layerName, viewer) {
      if (layer.name === layerName) {
          var visible = !viewer.isLayerVisible(layer);
          viewer.setLayerVisible(
              [layer], // array of layers
              visible, // visible
              false    // isolate
          );
      }
  }

  for (var i = 0; i < root.childCount; i++) {
      var layer = root.children[i];

      // We can also check inside layer groups 
      if (!layer.isLayer) {
          for (var j = 0; j < layer.childCount; j++) {
              toggleLayerSub(layer.children[j], layerName, viewer);
          }
      } else {
          toggleLayerSub(layer, layerName, viewer);
      }  
  }
}


function ViewerHelperExtension(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
    this.onSelectionBinded = this.onSelectionEvent.bind(this);
    this.onLoadedBinded = this.onLoadedEvent.bind(this);
    this.enumeratePropertiesBinded = this.enumerateProperties.bind(this);
    this.getPropertiesBinded = this.getProperties.bind(this);
    this.getPropertiesBinded = this.getProperties.bind(this);
    this._ids = null;
    this._offsets = null;
    this._avs = null;
    this._attrs = null;
    this._vals = null;
}

ViewerHelperExtension.prototype.enumerateProperties = function(id) {
  if (id > 0 && id < this._offsets.length) {
    const avStart = 2 * this._offsets[id];
    const avEnd = 2 * this._offsets[id + 1];
    let properties = [];
    console.log(avStart);
    console.log(avEnd);

    for (let i = avStart; i < avEnd; i += 2) {
      const attrOffset = this._avs[i];
      const valOffset = this._avs[i + 1];
      const attr = this._attrs[attrOffset];
      const value = this._vals[valOffset];
      properties.push({ name: attr[0], category: attr[1], value });
    }
    return properties;
  }
  return [];
};

ViewerHelperExtension.prototype.getProperties = function(id) {
  var props = {};
  for (var _i = 0, _a = this.enumerateProperties(id); _i < _a.length; _i++) {
      var prop = _a[_i];
      if (prop.category && prop.category.match(/^__\w+__$/)) {
          // Skip internal attributes
      }
      else {
          props[prop.name] = prop.value;
      }
  }
  return props;
};

ViewerHelperExtension.prototype.getChildren = function(id) {
  var children = [];
  for (var _i = 0, _a = this.enumerateProperties(id); _i < _a.length; _i++) {
      var prop = _a[_i];
      if (prop.category === '__child__') {
          children.push(prop.value);
      }
  }
  return children;
};

ViewerHelperExtension.prototype.onSelectionEvent = async function(event) {
  console.log(event);
  var currSelection = this.viewer.getSelection();
  var current = currSelection[0];
  if (this.viewer.getSelectionCount() !== 1) {
    console.log("No View");
  }
  
  this.viewer.model.getProperties(current, (item) => {
    const items = item.properties.filter((property) => !property.hidden);
    let retValue = {
      type: 'properties_event',
      data: items
    }
    console.log(retValue)
    // window.ReactNativeWebView.postMessage(JSON.stringify(retValue));
  });

  // 29419
  let properties = await this.getProperties(current);

  console.log("properties",properties);

};

ViewerHelperExtension.prototype.onLoadedEvent = function() {
  var cbCount = 0; // count pending callbacks
  var components = []; // store the results
  var tree;
  var propsToList = [];
  console.log("asdasd");
  function getLeafComponentsRec(parent) {
    cbCount++;
    if (tree.getChildCount(parent) != 0) {
        tree.enumNodeChildren(parent, function (children) {
            getLeafComponentsRec(children);
        }, false);
    } else {
        components.push(parent);
    }
    if (--cbCount == 0){
      console.log(components)
      this.viewer.model.getBulkProperties(components,{}, (model) => {
        console.log('models',model);
       
        this.viewer.model.getProperties(parent, (item) => {
          const items = item.properties.filter((property) => !property.hidden);
          let retValue = {
            type: '3D_model_loaded_event',
            data: {
              model: model,
              properties: items
            }
          }
          console.log(retValue)
        //   window.ReactNativeWebView.postMessage(JSON.stringify(retValue));
        });
      },(err)=>{
        console.log(err);
      });
    }
  }

  if(this.viewer.model.is3d()){
    this.viewer.getObjectTree(function (objectTree) {
      tree = objectTree;
      getLeafComponentsRec(tree.getRootId());
    },(err) => {
      console.log(err);
    });
  }

  if(viewer.model.is2d()){
    let retValue = {
      type: '2D_model_loaded_event',
      data: {
        layers: this.viewer.model.getPropertyDb().svf.layersRoot.children},
        metadata: this.viewer.model.getData().metadata
    }
    console.log(retValue);
    // window.ReactNativeWebView.postMessage(JSON.stringify(retValue));
  };
};

ViewerHelperExtension.prototype.load = async function() {
  console.log('Helper Extension is loaded!');
  this._ids = await fetchObjectJSON('./output/objects_ids.json.gz');
  this._offsets =  await fetchObjectJSON('./output/objects_offs.json.gz');
  this._avs =  await fetchObjectJSON('./output/objects_avs.json.gz');
  this._attrs =  await fetchObjectJSON('./output/objects_attrs.json.gz');
  this._vals =  await fetchObjectJSON('./output/objects_vals.json.gz');


  let properties = await this.enumeratePropertiesBinded(41);
  console.log("properties",properties);
  // this._ids = JSON.parse(pako.ungzip(, { to: 'string' }));
  var viewer = this.viewer;
  viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this.onSelectionBinded);
  viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this.onLoadedBinded);
  
  // viewer.container.addEventListener('click', function (ev) {
  //   // const result = viewer.clientToWorld(ev.clientX, ev.clientY);
  //   // if (result) {
  //   //   console.log(result.point);
  //   // }
  //   console.log(ev);
  //   console.log('client',{
  //     x:ev.clientX,
  //     y:ev.clientY
  //   });
  //   console.log('page',{
  //     x:ev.pageX,
  //     y:ev.pageY
  //   });
  //   console.log('layer',{
  //     x:ev.layerX,
  //     y:ev.layerY
  //   });
  //   console.log('screen',{
  //     x:ev.screenX,
  //     y:ev.screenY
  //   });
  // });

  return true;
};

ViewerHelperExtension.prototype.unload = function() {
  console.log('Helper Extension is unloaded!');
  this.viewer.removeEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this.onSelectionBinded);
  viewer.removeEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this.onLoadedBinded);
  this.onSelectionBinded = null;
  this.onLoadedBinded = null;
  return true;
};

Autodesk.Viewing.theExtensionManager.registerExtension('ViewerHelperExtension', ViewerHelperExtension);
