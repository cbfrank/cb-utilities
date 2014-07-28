declare module $data {
    interface IPromise<T> extends Object {
        then: {
            (handler: (args: T) => void): IPromise<any>;
            (handler: (args: T) => any): IPromise<any>;
        };
        fail: {
            (handler: (args: T) => void): IPromise<any>;
            (handler: (args: T) => any): IPromise<any>;
        };
        valueOf(): any;
    }

    export class Base implements Object {
        constructor(...params: any[]);
        getType: () => Base;
    }

    interface Event extends Object {
        attach(eventHandler: (sender: any, event: any) => void): void;
        detach(eventHandler: () => void): void;
        fire(e: any, sender: any): void;
    }

    export interface Entity extends Base {
        constructor();
        constructor(initData: {});

        entityState: number;
        changedProperties: any[];

        propertyChanging: Event;
        propertyChanged: Event;
        propertyValidationError: Event;
        isValid: boolean;

        context: EntityContext;
        asKoObservable(): Entity;
    }

    export interface Queryable<T extends Entity> extends Object {
        filter(predicate: (it: T) => boolean): Queryable<T>;
        filter(predicate: (it: T) => boolean, thisArg: any): Queryable<T>;
        filter(predicate: string, thisArg: any): Queryable<T>;

        map(projection: (it: T) => any): Queryable<any>;

        length(): $data.IPromise<Number>;
        length(handler: (result: number) => void): $data.IPromise<Number>;
        length(handler: { success?: (result: number) => void; error?: (result: any) => void; }): $data.IPromise<Number>;

        forEach(handler: (it: any) => void): $data.IPromise<T>;

        toArray(): $data.IPromise<T[]>;
        toArray(handler: (result: T[]) => void): $data.IPromise<T[]>;
        toArray(handler: { success?: (result: T[]) => void; error?: (result: any) => void; }): $data.IPromise<T[]>;

        single(predicate: (it: T) => boolean, params?: any, handler?: (result: T) => void): $data.IPromise<T>;
        single(predicate: (it: T) => boolean, params?: any, handler?: { success?: (result: T) => void; error?: (result: any) => void; }): $data.IPromise<T>;

        take(amout: number): Queryable<T>;
        skip(amout: number): Queryable<T>;

        order(selector: string): Queryable<T>;
        orderBy(predicate: (it: any) => any): Queryable<T>;
        orderByDescending(predicate: (it: any) => any): Queryable<T>;

        first(predicate: (it: T) => boolean, params?: any, handler?: (result: T) => void): $data.IPromise<T>;
        first(predicate: (it: T) => boolean, params?: any, handler?: { success?: (result: T) => void; error?: (result: any) => void; }): $data.IPromise<T>;

        include(selector: string): Queryable<T>;

        removeAll(): $data.IPromise<Number>;
        removeAll(handler: (count: number) => void): $data.IPromise<Number>;
        removeAll(handler: { success?: (result: number) => void; error?: (result: any) => void; }): $data.IPromise<Number>;
    }

    export interface EntitySet<T extends Entity> extends Queryable<T> {
        tableName: string;
        collectionName: string;

        add(item: T): T;
        add(initData: {}): T;

        attach(item: T): void;
        attach(item: {}): void;
        attachOrGet(item: T): T;
        attachOrGet(item: {}): T;

        detach(item: T): void;
        detach(item: {}): void;

        remove(item: T): void;
        remove(item: {}): void;

        elementType: T;
    }

    export interface EntityContext extends Object {
        constructor(config: any);
        constructor(config: { name: string; oDataServiceHost: string; MaxDataServiceVersion: string; });
        constructor(config: { name: string; oDataServiceHost?: string; databaseName?: string; localStoreName?: string; user?: string; password?: string; });

        onReady(): $data.IPromise<EntityContext>;
        onReady(handler: (currentContext: EntityContext) => void): $data.IPromise<EntityContext>;
        saveChanges(): $data.IPromise<Number>;
        saveChanges(handler: (result: number) => void): $data.IPromise<Number>;
        saveChanges(cb: { success?: (result: number) => void; error?: (result: any) => void; }): $data.IPromise<Number>;

        add(item: Entity): Entity;
        attach(item: Entity): void;
        attachOrGet(item: Entity): Entity;
        detach(item: Entity): void;
        remove(item: Entity): void;

        storageProvider: StorageProvider;
        stateManager: StateManager;
        getEntitySetFromElementType(entityType: Base): EntitySet<any>;
        prepareRequest?: (r: any[]) => void;
    }

    export class Blob implements Object {

    }
    export class Guid implements Object {
        constructor(value: string);
        value: string;
    }


    export class SimpleBase implements Object {
        constructor(initData: any);
    }
    export class Geospatial extends SimpleBase {
        constructor(initData: any);
        type: String;
    }
    export class Geography extends Geospatial {
        constructor(initData: any);
    }

    export class GeographyPoint extends Geography {
        constructor(initData: any);
        constructor(coordinates: any[]);
        constructor(longitude: number, latitude: number);
        longitude: number;
        latitude: number;
        coordinates: any[];
    }
    export class GeographyLineString extends Geography {
        constructor(initData: any);
        constructor(coordinates: any[]);
        coordinates: any[];
    }
    export class GeographyPolygon extends Geography {
        constructor(initData: any);
        constructor(coordinates: any[]);
        coordinates: any[];
    }
    export class GeographyMultiPoint extends Geography {
        constructor(initData: any);
        constructor(coordinates: any[]);
        coordinates: any[];
    }
    export class GeographyMultiLineString extends Geography {
        constructor(initData: any);
        constructor(coordinates: any[]);
        coordinates: any[];
    }
    export class GeographyMultiPolygon extends Geography {
        constructor(initData: any);
        constructor(coordinates: any[]);
        coordinates: any[];
    }
    export class GeographyCollection extends Geography {
        constructor(initData: any);
        constructor(geometries: any[]);
        geometries: any[];
    }

    export class Geometry extends Geospatial {
        constructor(initData: any);
    }

    export class GeometryPoint extends Geometry {
        constructor(initData: any);
        constructor(coordinates: any[]);
        constructor(x: number, y: number);
        x: number;
        y: number;
        coordinates: any[];
    }
    export class GeometryLineString extends Geometry {
        constructor(initData: any);
        constructor(coordinates: any[]);
        coordinates: any[];
    }
    export class GeometryPolygon extends Geometry {
        constructor(initData: any);
        constructor(coordinates: any[]);
        coordinates: any[];
    }
    export class GeometryMultiPoint extends Geometry {
        constructor(initData: any);
        constructor(coordinates: any[]);
        coordinates: any[];
    }
    export class GeometryMultiLineString extends Geometry {
        constructor(initData: any);
        constructor(coordinates: any[]);
        coordinates: any[];
    }
    export class GeometryMultiPolygon extends Geometry {
        constructor(initData: any);
        constructor(coordinates: any[]);
        coordinates: any[];
    }
    export class GeometryCollection extends Geography {
        constructor(initData: any);
        constructor(geometries: any[]);
        geometries: any[];
    }

    ///////////////////////////////////////////////////
    export function initService<T>(options: any): JQueryPromise<T>;
    export function initService<T>(apikey: any, options: any): JQueryPromise<T>;

    export interface StorageProvider {
        providerConfiguration: ProviderConfiguration
    }

    export interface ProviderConfiguration {
        name: string;
    }

    export interface ODataProviderConfiguration extends ProviderConfiguration {
        dbCreation: number; //$data.storageProviders.DbCreationType.DropTableIfChanged,
        oDataServiceHost: string;
        serviceUrl: string;
        maxDataServiceVersion: string;
        dataServiceVersion: string;
        setDataServiceVersionToMax: boolean;
        user: string;
        password: string;
        withCredentials: boolean;
        //enableJSONP: undefined,
        //useJsonLight: undefined
        disableBatch: boolean;
        UpdateMethod: string;
    }

    export interface EntityType {
        memberDefinitions: {
            getPublicMappedProperties(): {
                filter: (any) => boolean;
            }
        };
    }

    export interface ODataStorageProvider extends StorageProvider {
        _compile(queryable, params): any;
        saveChanges(callBack, changedItems): void;
    }

    export interface TrackedEntity {
        data: {
            initData: Object;
            entityState: number;
            getType(): EntityType;
        };

        entitySet: EntitySet<any>;
    }

    export interface StateManager {
        trackedEntities: TrackedEntity[];
        reset(): void;
    }

    export var EntityState: {
        Detached: number;
        Unchanged: number;
        Added: number;
        Modified: number;
        Deleted: number;
    };

    export var ConcurrencyMode:
        {
            Fixed: string;
            None: string;
        };

    export class EntityWrapper {
        getEntity(): Entity;
    }

    export interface ODataConverter {
        fromDb: {
            '$data.Date': (e: any) => any;
        };
        toDb: {
            '$data.Date': (e: any) => any;
        };
    }

    export var oDataConverter: ODataConverter;

    export var Container: any;
    export var MemberTypes: any;
    export var defaultErrorCallback: () => void;
    export var Guard: {
        raise(exception): void;
    };
}

declare module Q {
    export var resolve: (p: any) => $data.IPromise<any>;
    export var when: (p: $data.IPromise<any>, then?: () => any, fail?: () => any) => $data.IPromise<any>;
    export var all: (p: $data.IPromise<any>[]) => $data.IPromise<any>;
    export var allResolved: (p: $data.IPromise<any>[]) => $data.IPromise<any>;

    export var fcall: (handler: () => any) => $data.IPromise<any>;
}

interface String {
    contains(s: string): boolean;
    startsWith(s: string): boolean;
    endsWith(s: string): boolean;
    strLength(): number;
    indexOf(s: string): number;
    concat(s: string): string;
}

interface Date {
    day(): number;
    hour(): number;
    minute(): number;
    month(): number;
    second(): number;
    year(): number;
}

interface Number {
    round(): number;
    floor(): number;
    ceiling(): number;
}

declare var Exception: (message, name?, data?) => void;
declare var Guard: any;

