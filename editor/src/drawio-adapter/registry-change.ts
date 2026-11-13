import {REGISTRY_ATTRIBUTE} from '../persistence/registry';
export class RegistryAttributeChange {
  constructor(private node: Element, private next: string | null) {}
  execute() {
    const previous=this.node.getAttribute(REGISTRY_ATTRIBUTE);
    if (this.next===null) this.node.removeAttribute(REGISTRY_ATTRIBUTE);
    else this.node.setAttribute(REGISTRY_ATTRIBUTE,this.next);
    this.next=previous;
  }
}
