class App{
    config = {
        baseUri: null,
        corsAllow:false
    };
    components = {};
    constructor(config){
        this.config = { ...this.config, ...config };
    };

    component(uid,data){
        this.components[uid] = new App_Component(uid,data);
    }


}
