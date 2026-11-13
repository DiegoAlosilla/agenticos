// Exercise the remaining native Extras entry points after removing sidebar shortcuts.
export async function contractMenu(page,key){
  const labels={contractsDemo:'Insertar endpoint ficticio',contractsInspect:'Panel de endpoint',contractsCatalog:'Catálogo de contratos'};
  await page.getByText('Extras',{exact:true}).click();
  await page.getByText(labels[key],{exact:true}).click();
}
