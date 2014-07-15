declare module $data {
    interface PromiseStatic {
        <T>(): IPromise<T>;
    }
    export interface Deferred {
        deferred: JQueryDeferred<any>;
        getPromise(): $data.IPromise<any>;
    }
    export function PromiseHandler(): Deferred;
    export interface EntityExtend {
        asKoObservable(): any;
    }
    export function initService<T>(options: any): JQueryPromise<T>;
    export function initService<T>(apikey: any, options: any): JQueryPromise<T>;
}

module $CB.Data {
    export interface $IEntity extends $data.Entity {
        context: $data.EntityContext;
    }

    export class $Entity extends $data.Entity implements $IEntity {
        context: $data.EntityContext;
    }
}