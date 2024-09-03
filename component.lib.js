class App_Component {
  properties = {};
  init = null;
  methods = {};
  computed = null;
  prop = {};
  watch = null;
  config = {
    disableTwoWayBinding:false,
    disableReactivity:false
  };

  constructor(uid, data) {
    this.uid = uid;
    this._properties = data["properties"] ?? {};
    this.init = data["init"] ?? null;
    this.methods = data["methods"] ?? {};
    this.computed = data["computed"] ?? null;
    this.watch = data["watch"] ?? null;
    this.config = { ...this.config, ...data["config"] ?? {} };
    this.prop = {};

    if(!this.config.disableReactivity){
      this.propertyBinding();
    }
    
    this.methodBinding();

    if (typeof this.init === "function") {
      this.init();
    }
  }

  getComponentElement() {
    return document.querySelector(`component[cl-uid="${this.uid}"]`);
  }

  propertyBinding() {

    let changed_event_available = true;

    document.addEventListener("cl-property-changed", (data) => {
      if(!this.config.disableReactivity){
        this.handleCompute();
        this.watchBinding(data.detail.property,data.detail.value);
      }
      
    });

    this.prop = new Proxy(this._properties, {
      get: (target, prop) => {
        return target[prop] ?? null;
      },
      set: (target, prop, val) => {
        // Update internal _properties
        target[prop] = val;

        if(!this.config.disableReactivity){
          this.getComponentElement()
          .querySelectorAll(`[cl-model="${prop}"]`)
          .forEach((v) => {
            if (!v.closest('component-container')) {
              v.value = val;
          }
          });

        // Dispatch custom event for property change
        if(changed_event_available){
          document.dispatchEvent(
            new CustomEvent("cl-property-changed", {
              detail: {
                property: prop,
                value: val,
              },
            })
          );
        }
        }
        

        return true; // Indicate that the assignment was successful
      },
    });

    changed_event_available = false;

    var t = this;
    Object.entries(this._properties).forEach(function(v){
      t.prop[v[0]] = v[1];
    });

    changed_event_available = true;

    if(!this.config.disableTwoWayBinding || !this.config.disableReactivity){
      this.getComponentElement()
      .querySelectorAll("[cl-model]")
      .forEach((v) => {
        const event_type = v.getAttribute("cl-model-event") ?? "changed";
        if (!v.closest('component-container')) {
          v.addEventListener(event_type, (d) => {
            const model = d.target.attributes["cl-model"]?.value;
            if (model) {
              this.prop[model] = d.target.value != "" ? (isNaN(d.target.value)
                ? d.target.value
                : Number(d.target.value)) : ""; // Use Proxy for updates
            }
          });
        }
        
      });
    } 

    

  }

  methodBinding() {
    let events = {
      "cl-on-click": "click",
      "cl-on-keyup": "keyup",
      "cl-on-keydown": "keydown",
      "cl-on-change": "change",
    };

    let t = this;

    Object.entries(events).forEach(function (v) {
      t.getComponentElement()
        .querySelectorAll("[" + v[0] + "]")
        .forEach((element) => {
          if (!element.closest('component-container')) {
            const methodCall = element.getAttribute(v[0]);

            if (methodCall) {
              const [methodName, ...args] = t.parseMethodCall(methodCall);
  
              element.addEventListener(v[1], () => {
                if (typeof t.methods[methodName] === "function") {
                  t.methods[methodName].apply(t, args);
                } else {
                  console.error(
                    `Method ${methodName} is not defined or not a function`
                  );
                }
              });
            }

          }
          
        });
    });
  }

  watchBinding(prop,value){
    if(typeof this.watch === "function"){
      (this.watch)(prop,value);
    }
  }

  parseMethodCall(methodCall) {
    const matches = methodCall.match(/^(\w+)\(([^)]*)\)$/);
    if (matches) {
      const methodName = matches[1];
      const args = matches[2]
          .split(',')
          .map(arg => arg.trim())
          .map(arg => {
              // Remove quotes from string arguments
              if (arg.startsWith('"') && arg.endsWith('"')) {
                  return arg.slice(1, -1); // Remove surrounding quotes
              } else if (arg.startsWith("'") && arg.endsWith("'")) {
                  return arg.slice(1, -1); // Remove surrounding quotes
              }
              return isNaN(arg) ? arg : Number(arg); // Convert to number if possible
          });
      return [methodName, ...args];
  }
    return [methodCall];
  }

  handleCompute() {
    if (typeof this.computed === "function") {
      this.computed(); // Ensure computed method has the correct `this` context
    }
  }

  disableReactivity(){
    this.config.disableReactivity = true;
  }

  loadComponent(name,url,params){
    var t = this;

    fetch(url,{
      method: 'GET',
      body:JSON.stringify(params)
    }).then(function(resp){
      return resp.json();
    }).then(function(resp){
      t.getComponentElement().querySelector('component-container[cl-component="' + name +'"]').innerHTML = resp.html;
    });
  }
}
