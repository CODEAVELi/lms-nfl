// Workbook bytes and row-level data remain in this browser worker.
importScripts("vendor/xlsx.mini.min.js");
self.onmessage = event => {
  try {
    const workbook = XLSX.read(event.data,{type:"array",cellFormula:false,cellHTML:false,cellStyles:false,sheetRows:20002});
    const sheets = workbook.SheetNames.map(name=>{
      const sheet = workbook.Sheets[name];
      const range = XLSX.utils.decode_range(sheet["!fullref"] || sheet["!ref"] || "A1");
      if (range.e.r >= 20000 || range.e.c >= 100) throw new Error("Workbook sheets must have at most 20,000 rows and 100 columns.");
      return {name,rows:XLSX.utils.sheet_to_json(sheet,{header:1,defval:"",raw:false,blankrows:false})};
    });
    self.postMessage({sheets});
  } catch(error) {self.postMessage({error:error.message || "Unable to read workbook."});}
};
