
export enum GraphCoreTypes {
    Boolean = "Boolean",
    String = "String",
    Number = "Number",
}

declare module "./GraphTypes" {
    export interface GraphTypeMap {
        [GraphCoreTypes.Boolean]: boolean;
        [GraphCoreTypes.String]: string;
        [GraphCoreTypes.Number]: number;
    }
}
