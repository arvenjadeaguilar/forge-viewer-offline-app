// Content for 'my-awesome-extension.js'

function MyAwesomeExtension(viewer, options) {
  Autodesk.Viewing.Extension.call(this, viewer, options);
  this.lockViewport = this.lockViewport.bind(this);
  this.unlockViewport = this.unlockViewport.bind(this);
  this.onSelectionBinded = this.onSelectionEvent.bind(this);
  this.onSetNavToolBinded = this.onSetNavTool.bind(this);
  this.onNavigationModeBinded = this.onNavigationModeEvent.bind(this);
}

MyAwesomeExtension.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
MyAwesomeExtension.prototype.constructor = MyAwesomeExtension;

MyAwesomeExtension.prototype.onNavigationModeEvent = function(event) {
  var domElem = document.getElementById('MyToolValue');
  domElem.innerText = event.id;
};
MyAwesomeExtension.prototype.onSelectionEvent = function(event) {
  console.log(event);
  console.log(event.target.navigation.getPosition());
  var currSelection = this.viewer.getSelection();
  var current = currSelection[0];
  var domElem = document.getElementById('MySelectionValue');
  domElem.innerText = currSelection.length;

  if (viewer.getSelectionCount() !== 1) {
    console.log("No View");
  }

  viewer.model.getProperties(current, (item) => {
    const items = item.properties.filter((property) => !property.hidden);
    console.log(items);
  });
};

MyAwesomeExtension.prototype.onToolbarCreated = function(toolbar) {
  // alert('TODO: customize Viewer toolbar');

  var viewer = this.viewer;

  // Button 1
  var button1 = new Autodesk.Viewing.UI.Button('show-env-bg-button');
  button1.onClick = function(e) {
    viewer.setEnvMapBackground(true);
  };
  button1.addClass('show-env-bg-button');
  button1.setToolTip('Show Environment');

  // Button 2
  var button2 = new Autodesk.Viewing.UI.Button('hide-env-bg-button');
  button2.onClick = function(e) {
    viewer.setEnvMapBackground(false);
  };
  button2.addClass('hide-env-bg-button');
  button2.setToolTip('Hide Environment');

  // SubToolbar
  this.subToolbar = new Autodesk.Viewing.UI.ControlGroup('my-custom-toolbar');
  this.subToolbar.addControl(button1);
  this.subToolbar.addControl(button2);

  toolbar.addControl(this.subToolbar);
};

MyAwesomeExtension.prototype.onSetNavTool = function(value) {
  this.viewer.setActiveNavigationTool(value);
};

MyAwesomeExtension.prototype.lockViewport = function() {
  this.viewer.setNavigationLock(true);
};

MyAwesomeExtension.prototype.unlockViewport = function() {
  this.viewer.setNavigationLock(false);
};

MyAwesomeExtension.prototype.load = function() {
  console.log('MyAwesomeExtension is loaded!');
  var viewer = this.viewer;
  this._lockBtn = document.getElementById('MyAwesomeLockButton');
  this._lockBtn.addEventListener('click', this.lockViewport);

  this._unlockBtn = document.getElementById('MyAwesomeUnlockButton');
  this._unlockBtn.addEventListener('click', this.unlockViewport);

  this._dollyBtn = document.getElementById('EnableDolly');
  this._dollyBtn.addEventListener('click', ()=>this.onSetNavTool('dolly'));
  
  this._panBtn = document.getElementById('EnablePan');
  this._panBtn.addEventListener('click', ()=>this.onSetNavTool('pan'));


  viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this.onSelectionBinded);
  viewer.addEventListener(Autodesk.Viewing.NAVIGATION_MODE_CHANGED_EVENT, this.onNavigationModeBinded);
  viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, function () {
    var cbCount = 0; // count pending callbacks
    var components = []; // store the results
    var tree; // the instance tree
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
          console.log(components)
          viewer.model.getBulkProperties(components,{}, (item) => {
            console.log('item',item);
          },(err)=>{
            console.log(err);
          });
        }
    }

    if(viewer.model.is3d()){
      viewer.getObjectTree(function (objectTree) {
        tree = objectTree;
        var allLeafComponents = getLeafComponentsRec(tree.getRootId());
      });
    }

    if(viewer.model.is2d()){
      console.log("items",viewer.model.getPropertyDb().svf.layersRoot.children);
    };
  });

  viewer.setLightPreset(6);
  viewer.setEnvMapBackground(true);
  
  
  return true;
};

MyAwesomeExtension.prototype.unload = function() {
  console.log('MyAwesomeExtension is now unloaded!');
  if (this._lockBtn) {
    this._lockBtn.removeEventListener('click', this.lockViewport);
    this._lockBtn = null;
  }

  if (this._unlockBtn) {
    this._unlockBtn.removeEventListener('click', this.unlockViewport);
    this._unlockBtn = null;
  }

  this.viewer.removeEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, this.onSelectionBinded);
  this.onSelectionBinded = null;
  if (this.subToolbar) {
    this.viewer.toolbar.removeControl(this.subToolbar);
    this.subToolbar = null;
}
  return true;
};

Autodesk.Viewing.theExtensionManager.registerExtension('MyAwesomeExtension', MyAwesomeExtension);