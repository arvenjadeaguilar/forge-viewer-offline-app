
let headers = new Headers({
  'Accept-Encoding': 'gzip, deflate',
  'Content-Type': 'application/json',
});

async function fetchObjectJSON(uri){
  let ret = await fetch(uri, {
    method: 'GET',
    compress: true,
    headers: headers,
  });
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
    this.onNavigationModeBinded = this.onNavigationMode.bind(this);
    this.updateIconsBinded = this.updateIcons.bind(this);
    this.getBounds2DBinded = this.getBounds2D.bind(this);
    this.showIconsBinded = this.showIcons.bind(this);
    this.measurement = null;
    this._ids = null;
    this._offsets = null;
    this._avs = null;
    this._attrs = null;
    this._vals = null;
    this.markup = null;
    this.onSetNavToolBinded = this.onSetNavTool.bind(this);

    this._group = null;
    this._button = null;
    this._icons = [
    ];
}

ViewerHelperExtension.prototype.enumerateProperties = function(id) {
  if (id > 0 && id < this._offsets.length) {
    const avStart = 2 * this._offsets[id];
    const avEnd = 2 * this._offsets[id + 1];
    let properties = [];

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
    // window.ReactNativeWebView.postMessage(JSON.stringify(retValue));
  });

  // 29419
  // let properties = await this.getProperties(current);
  console.log(current, currSelection)

  // let bounds = getObjectBound2D(this.viewer,current);
  // console.log(bounds.center());
};

ViewerHelperExtension.prototype.onLoadedEvent = function() {
  var cbCount = 0; // count pending callbacks
  var components = []; // store the results
  var tree;
  var propsToList = [];
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
      this.viewer.model.getBulkProperties(components,{}, (model) => {
        this.viewer.model.getProperties(parent, (item) => {
          const items = item.properties.filter((property) => !property.hidden);
          let retValue = {
            type: '3D_model_loaded_event',
            data: {
              model: model,
              properties: items
            }
          }
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
    // window.ReactNativeWebView.postMessage(JSON.stringify(retValue));
  };
  // if(this.viewer.toolbar){
  //   let removeSettings = this.viewer.toolbar.getControl('settingsTools');
  //   let navTools = this.viewer.toolbar.getControl('navTools');
  //   // this.viewer.toolbar.removeControl(navTools);
  //   this.viewer.toolbar.removeControl(removeSettings);
  //   // var ext = viewer.getExtension('Autodesk.Measure');
  //   // ext.measurementToolbarButton.removeFromParent();
  //   this.viewer.toolbar.setVisible(false);
  // }
};

ViewerHelperExtension.prototype.onNavigationMode = function(event) {
  // if(this.viewer.toolbar){
  //   viewer.loadExtension('Autodesk.Measure');
  //   const measure = viewer.getExtension('Autodesk.Measure');
  //   measure.activate();
  // }

  if(this.viewer.toolbar){
    // let extensionVal = this.viewer.getExtension('Autodesk.ThreeJSOverlays')
    // let scene = extensionVal.createOverlayScene('MyScene');

    // const geometry = new THREE.SphereGeometry(15, 32, 16);
    // const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    // const sphere = new THREE.Mesh(geometry, material);
    // scene.add(sphere);
  }
    

};

ViewerHelperExtension.prototype.onFullyLoaded = function(event) {
  // if(this.viewer.toolbar){
  //   viewer.loadExtension('Autodesk.Measure');
  //   const measure = viewer.getExtension('Autodesk.Measure');
  //   measure.activate();
  // }

    
};

ViewerHelperExtension.prototype.showIcons = function(show) {
  const $viewer = $('#' + this.viewer.clientContainer.id + ' div.adsk-viewing-viewer');
  // remove previous...
  $('#' + this.viewer.clientContainer.id + ' div.adsk-viewing-viewer label.markup').remove();
  if (!show) return;

  // do we have anything to show?
  if (this._icons === undefined || this.icons === null) return;

  // do we have access to the instance tree?
  // const tree = this.viewer.model.getInstanceTree();
  // if (tree === undefined) { console.log('Loading tree...'); return; }

  const onClick = (e) => {
    let id = $(e.currentTarget).data('id');

    this.viewer.select(id);
    this.viewer.utilities.fitToView();
    // switch (id){
    //   case 563:
    //     alert('Sensor offline');
    // }
    console.log("Clicked");
  };
  this._frags = {}
  for (var i = 0; i < this._icons.length; i++) {
    // we need to collect all the fragIds for a given dbId
    const icon = this._icons[i];
    this._frags['dbId' + icon.dbId] = []
    // create the label for the dbId
    const $label = $(`
    <label class="markup update" data-id="${icon.dbId}" data-type="${icon.type}" data-positionX="${icon.position.x}" data-positionY="${icon.position.y}">
        <span class="${icon.css}"> ${icon.label || ''}</span>
    </label>
    `);
    $label.css('display', this.viewer.isNodeVisible(icon.dbId) ? 'block' : 'none');
    $label.on('click', onClick);
    $viewer.append($label);
    // now collect the fragIds
    const _this = this;
    // tree.enumNodeFragments(icon.dbId, function (fragId) {
    //     _this._frags['dbId' + icon.dbId].push(fragId);
    //     _this.updateIcons(); // re-position of each fragId found
    // });
    _this.updateIcons(); // re-position of each fragId found

  }
};


ViewerHelperExtension.prototype.onSetNavTool = function(value) {
  console.log(this.viewer.getActiveNavigationTool());
  this.viewer.setActiveNavigationTool(value);
};

ViewerHelperExtension.prototype.getBounds2D = function(dbId) {
  const frags = this.viewer.model.getFragmentList();
  let bounds = new THREE.Box3();
  let boundsCallback = new Autodesk.Viewing.Private.BoundsCallback(bounds);
  let fragIds = frags.fragments.dbId2fragId[dbId]; // Find all fragments including this object's primitives
  if (!Array.isArray(fragIds)) {
    fragIds = [fragIds];
  }
  for (const fragId of fragIds) {
    // Get the actual mesh with all geometry data for given fragment
    const mesh = frags.getVizmesh(fragId);
    const vbr = new Autodesk.Viewing.Private.VertexBufferReader(mesh.geometry, this.viewer.impl.use2dInstancing);
    vbr.enumGeomsForObject(dbId, boundsCallback); // Update bounds based on all primitives linked to our dbId
  }
  return bounds;
};


function getObjectBound2D(viewer, objectId) {
  var model = viewer.model;
  // This doesn't guarantee that an object tree will be created but it will be pretty likely
  var bounds, bc, i;
  if (model.is2d()) {
      bounds = new THREE.Box3();
      // move this next one up into the calling method
      bc = new Autodesk.Viewing.Private.BoundsCallback(bounds);

      var dbId2fragId = model.getData().fragments.dbId2fragId;

      var fragIds = dbId2fragId[objectId];
      // fragId is either a single vertex buffer or an array of vertex buffers
      if (Array.isArray(fragIds)) {
          for (var j = 0; j < fragIds.length; j++) {
              // go through each vertex buffer, looking for the object id
              find2DBounds(model, fragIds[j], objectId, bc);
          }
      } else if (typeof fragIds === 'number') {
          // go through the specific vertex buffer, looking for the object id
          find2DBounds(model, fragIds, objectId, bc);
      }

      // should have some real box at this point; check
      if (!bounds.empty()) {
          return bounds;
      }
  }

  function find2DBounds(model, fragId, dbId, bc) {
      var mesh = model.getFragmentList().getVizmesh(fragId);
      var vbr = new Autodesk.Viewing.Private.VertexBufferReader(mesh.geometry);
      vbr.enumGeomsForObject(dbId, bc);
  }

  function find2DLayerBounds(model, fragId, bc) {
      var mesh = model.getFragmentList().getVizmesh(fragId);
      var vbr = new Autodesk.Viewing.Private.VertexBufferReader(mesh.geometry);
      var visibleLayerIds = that.getVisibleLayerIds();
      vbr.enumGeomsForVisibleLayer(visibleLayerIds, bc);
  }
};

ViewerHelperExtension.prototype.updateIcons = function() {
  for (const label of $('#' + this.viewer.clientContainer.id + ' div.adsk-viewing-viewer .update')) {
    const $label = $(label);
    const id = $label.data('id');
    const positionX = $label.data('positionx');
    const positionY = $label.data('positiony');

    // get the center of the dbId (based on its fragIds bounding boxes)
    const bounds = this.getBounds2DBinded(id);
    // console.log(bounds.getCenter());
    // const bounds = getObjectBound2D(this.viewer,id);
    
    const coords = this.viewer.worldToClient({x: parseFloat(positionX), y: parseFloat(positionY), z:0});

    // position the label center to it
    $label.css('left',coords.x + 'px');
    $label.css('top', coords.y + 'px');
    $label.css('display', this.viewer.isNodeVisible(id) ? 'block' : 'none');
  }
};

ViewerHelperExtension.prototype.load = async function() {
  console.log('Helper Extension is loaded!');
  let rootUrl = fileUrl.split('/')[0];
  this._ids = await fetchObjectJSON(`http://127.0.0.1:8080/${rootUrl}/objects_ids.json.gz`);
  this._offsets =  await fetchObjectJSON(`./${rootUrl}/objects_offs.json.gz`);
  this._avs =  await fetchObjectJSON(`./${rootUrl}/objects_avs.json.gz`);
  this._attrs =  await fetchObjectJSON(`./${rootUrl}/objects_attrs.json.gz`);
  this._vals =  await fetchObjectJSON(`./${rootUrl}/objects_vals.json.gz`);
  let DimensionMarkup = document.getElementById('EnableDimension');
  DimensionMarkup.addEventListener('click', ()=>{
    // this.viewer.toolbar.setVisible(true);
    // if(this.viewer.toolbar){
    //   viewer.loadExtension('Autodesk.Measure');
    //   const measure = viewer.getExtension('Autodesk.Measure');
    //   measure.activate('distance');
    //   measure.setUnits("ft");
    // }
    
    if(this.viewer.toolbar){
      viewer.loadExtension('Autodesk.BoxSelection');
      const BoxSelection = viewer.getExtension('Autodesk.BoxSelection');
      console.log(BoxSelection);
      BoxSelection.activate(true);
      // BoxSelection.addToolbarButton(true);
      this.onSetNavToolBinded('box-selection');

    }
    
  });

  let EnableAngle = document.getElementById('EnableAngle');
  EnableAngle.addEventListener('click', ()=>{
    // this.viewer.toolbar.setVisible(true);
    if(this.viewer.toolbar){
      viewer.unloadExtension('Autodesk.Measure');
      viewer.loadExtension('Autodesk.Measure');
      // const measure = viewer.getExtension('Autodesk.Measure');
      // console.log(measure.getMeasurementList('ft'));
      // measure.deleteAllMeasurements();
      
    }
  });

  let EnableArea = document.getElementById('EnableArea');
  EnableArea.addEventListener('click', ()=>{
    this.viewer.toolbar.setVisible(true);
    if(this.viewer.toolbar){
      viewer.loadExtension('Autodesk.Measure');
      const measure = viewer.getExtension('Autodesk.Measure');
      measure.activate('area');
    }
  });

  let EnableMarkup = document.getElementById('EnableMarkup');
  EnableMarkup.addEventListener('click', ()=>{
    this.markup = viewer.getExtension("Autodesk.Viewing.MarkupsCore");
    this.markup.enterEditMode();
    console.log(this.markup);
    // this.showIconsBinded(true);
    // this._enabled = true;
    this.markup.enterEditMode();
    this.markup.changeEditMode(new Autodesk.Viewing.Extensions.Markups.Core.EditModeRectangle(this.markup));
    // this.markup.leaveEditMode();
    // this.markup.show();

    $('#selectEntity').show()

  });

  let AddLogoMarkup = document.getElementById('AddLogoMarkup');
  AddLogoMarkup.addEventListener('click', ()=>{
    var bounds = viewer.impl.model.getData().bbox.max;
    let scale = 0.001;
    console.log(bounds.x/scale-180);
    console.log(bounds.y/scale);
    // Our crazy stamp !
    _markupdata = `
    <svg xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(3) scale(${scale} -${scale}) translate(${2.1983473520430303/scale-180} ${-8500})">

    <path fill-rule="evenodd" clip-rule="evenodd" fill="#fff" fill-opacity="0" d="M0 0h192.756v192.756H0V0z"/><path fill-rule="evenodd" clip-rule="evenodd" fill="#255398" d="M9.602 141.23h173.552V51.527H9.602v89.703z"/><path fill="none" stroke="#255398" stroke-width="1.784" stroke-miterlimit="2.613" d="M9.602 51.527h173.552v89.703H9.602V51.527z"/><path fill-rule="evenodd" clip-rule="evenodd" fill="#255398" d="M12.305 138.137h168.146V54.074H12.305v84.063z"/><path fill="none" stroke="#fff" stroke-width="2.673" stroke-miterlimit="2.613" d="M12.665 54.802h167.427v83.153H12.665V54.802z"/><path d="M95.567 129.584c40.369 0 73.89-15.283 73.89-33.297 0-17.831-33.521-33.115-73.89-33.115-40.368 0-72.088 15.284-72.088 33.115 0 18.014 31.72 33.297 72.088 33.297z" fill-rule="evenodd" clip-rule="evenodd" fill="#fff" stroke="#fff" stroke-width="2.673" stroke-miterlimit="2.613"/><path d="M95.567 129.584c40.369 0 73.89-15.283 73.89-33.297 0-17.831-33.521-33.116-73.89-33.116-40.368 0-72.088 15.285-72.088 33.116 0 18.014 31.72 33.297 72.088 33.297z" fill-rule="evenodd" clip-rule="evenodd" fill="#cf4044" stroke="#fff" stroke-width="1.425" stroke-miterlimit="2.613"/><path d="M95.388 125.035c36.405 0 69.745-12.555 69.745-28.748 0-16.011-33.34-28.749-69.745-28.749-36.226 0-67.764 12.738-67.764 28.749 0 16.193 31.539 28.748 67.764 28.748z" fill="none" stroke="#fff" stroke-width="1.784" stroke-miterlimit="2.613"/><path d="M67.813 108.842l-.54-4.004h-6.309l-1.442 4.004h-6.127l9.731-27.657h7.75l3.064 27.657h-6.127zm-1.983-17.65l-.359.365-2.703 7.643h3.785l-.723-8.008zM90.16 108.842h-3.965c-5.767.182-12.254-4.184-11.353-13.647 1.261-12.372 10.812-14.01 14.237-14.01h4.505l-.9 6.55h-4.145c-3.786 0-6.128 4.185-6.489 7.277-.361 3.277.721 7.281 4.325 7.281h4.686l-.901 6.549zM109.625 99.199l-4.506 9.643h-2.523l-1.983-9.826-.361-.364-1.08 10.19h-5.767l3.244-27.657h6.126l2.705 12.737 6.127-12.737h6.127l-3.244 27.657h-5.767l1.261-10.19-.359.547zM131.43 87.735h4.506l.723-6.55h-4.146c-3.424 0-12.975 1.638-14.236 14.01-1.082 9.463 6.127 13.647 11.895 13.647 1.803 0 1.623.182 3.244 0l.721-6.549h-3.965c-2.344 0-4.867-2.184-5.047-4.369h9.553l.9-6.367h-9.73c.896-2.002 3.24-3.822 5.582-3.822zM141.244 103.373c.797 0 1.574.205 2.334.617a4.37 4.37 0 0 1 1.771 1.773c.424.768.637 1.568.637 2.402 0 .826-.209 1.619-.627 2.381a4.409 4.409 0 0 1-1.754 1.773c-.754.424-1.539.633-2.361.633s-1.609-.209-2.361-.633a4.43 4.43 0 0 1-1.758-1.773 4.864 4.864 0 0 1-.629-2.381c0-.834.213-1.635.639-2.402a4.398 4.398 0 0 1 1.775-1.773c.758-.412 1.537-.617 2.334-.617zm0 .793a4.02 4.02 0 0 0-1.947.518 3.715 3.715 0 0 0-1.48 1.479 4.084 4.084 0 0 0-.535 2.004c0 .689.176 1.352.527 1.982.35.633.838 1.127 1.469 1.48a3.946 3.946 0 0 0 1.967.531c.682 0 1.34-.178 1.969-.531s1.115-.848 1.463-1.48a4.05 4.05 0 0 0 .521-1.982c0-.695-.176-1.363-.529-2.004a3.696 3.696 0 0 0-1.48-1.479c-.636-.344-1.285-.518-1.945-.518zm-2.082 6.646v-5.152h1.754c.602 0 1.035.045 1.303.141s.48.262.641.498a1.374 1.374 0 0 1-.16 1.74c-.266.279-.621.436-1.061.471.182.074.326.166.434.271.207.205.459.545.756 1.023l.623 1.008h-1.006l-.456-.812c-.355-.637-.641-1.039-.859-1.199-.15-.119-.371-.178-.66-.178h-.484v2.189h-.825zm.824-2.9h1c.477 0 .803-.072.977-.215a.707.707 0 0 0 .262-.572.704.704 0 0 0-.127-.41.747.747 0 0 0-.348-.27c-.148-.061-.424-.088-.828-.088h-.936v1.555z" fill-rule="evenodd" clip-rule="evenodd" fill="#fff"/>
    </g></svg>
    `;

    this.markup = viewer.getExtension("Autodesk.Viewing.MarkupsCore");
    this.markup.enterEditMode();
    this.markup.leaveEditMode();
    this.markup.loadMarkups(_markupdata, 'LogoLayer')

  });

  let DisableMarkup = document.getElementById('DisableMarkup');
  DisableMarkup.addEventListener('click', ()=>{
    this.markup = viewer.getExtension("Autodesk.Viewing.MarkupsCore");
    this.markup.leaveEditMode();
    var markupsStringData = this.markup.generateData();
    this.markup.loadMarkups(markupsStringData, 'LogoLayer')

    // console.log(markupsStringData);
    // this.markup.hide();
  });

  const updateIconsCallback = () => {
    if (this._enabled) {
        this.updateIconsBinded();
    }
  };
  

  
  // let properties = await this.enumeratePropertiesBinded(41);
  // console.log("properties",properties);
  // this._ids = JSON.parse(pako.ungzip(, { to: 'string' }));
  var viewer = this.viewer;
  viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this.onSelectionBinded);
  viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, this.onLoadedBinded);
  viewer.addEventListener(Autodesk.Viewing.NAVIGATION_MODE_CHANGED_EVENT, this.onNavigationModeBinded);
  viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, updateIconsCallback);
  viewer.addEventListener(Autodesk.Viewing.ISOLATE_EVENT, updateIconsCallback);
  viewer.addEventListener(Autodesk.Viewing.HIDE_EVENT, updateIconsCallback);
  viewer.addEventListener(Autodesk.Viewing.SHOW_EVENT, updateIconsCallback);
  viewer.loadExtension('MySelectionWindow');
  
  // if(this.viewer.toolbar){
  //   let removeSettings = this.viewer.toolbar.getControl('settingsTools');
  //   let navTools = this.viewer.toolbar.getControl('navTools');
  //   // this.viewer.toolbar.removeControl(navTools);
  //   this.viewer.toolbar.removeControl(removeSettings);
  //   this.viewer.toolbar.setVisible(false);
  //   // var ext = viewer.getExtension('Autodesk.Measure');
  //   // ext.measurementToolbarButton.removeFromParent();
  // }
  let _this = this;
  // viewer.container.addEventListener('click', function (ev) {
  //   let coords = viewer.impl.clientToViewport(ev.clientX, ev.clientY); //c.Vector3 {x: -0.9696521095484826, y: 0.9200779727095516, z: 1 (always 1)}
  //   let finalCoords = coords.unproject(viewer.impl.camera) //c.Vector3 {x: -26.379134321221724, y: 5.162777223710702, z: 1.3846547842336627}
  //   _this._icons = [..._this._icons, { dbId: 30540, css: 'fas fa-sticky-note', type: 'note', position: finalCoords }]
  //   // _this._icons.push({ dbId: 30540, css: 'fas fa-sticky-note', type: 'note', position: finalCoords });
  //   _this.showIconsBinded(true);
  //   // console.log(_this._icons);
  //   _this._enabled = true;
  //   console.log(finalCoords);
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
