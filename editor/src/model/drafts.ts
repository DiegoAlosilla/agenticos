export type ScalarType = 'string' | 'integer' | 'number' | 'boolean';
export interface DraftField {name:string; type:ScalarType; description:string; required:boolean; example:string}
export interface DraftParameter extends DraftField {location:'path'|'query'|'header'|'cookie'}
export interface DraftResponse {code:string; description:string; body:'none'|'object'; fields:DraftField[]}
export interface DraftOperation {id:string; method:'GET'; path:string; operationId:string; summary:string; description:string; parameters:DraftParameter[]; responses:DraftResponse[]}
export interface DraftApi {id:string; profile:'basic-openapi-3.0.1/v1'; title:string; version:string; description:string; server:string; tag:string; security:'none'|'bearer'; operations:DraftOperation[]}
export interface DraftStore {version:1; apis:DraftApi[]}
export interface DraftRef {apiId:string; operationId?:string}
export interface DraftIssue {field:string; message:string; operationId?:string}
