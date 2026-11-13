export interface BianOperation {
  method:string;path:string;action:string;operationId:string;summary:string;description:string;tags:string[];
}
export interface BianDomain {
  id:string;title:string;description:string;version:string;source:string;operations:BianOperation[];
}
export interface BianCatalog {
  notice:string;release:string;landscape:string;variant:string;commit:string;domains:BianDomain[];
}
