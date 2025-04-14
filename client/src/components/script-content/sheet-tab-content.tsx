import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useScriptData } from "@/hooks/use-script-data";
import { Plus } from "lucide-react";
import { SpreadsheetRow, ScriptCorrelation } from "@shared/schema";

export function SheetTabContent({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetRow[]>([
    { id: 1, generalData: "", shotNumber: 1, shotData1: "", shotData2: "", shotData3: "", shotData4: "", hasCorrelation: false }
  ]);
  
  // Use our script data hook for persistence
  const {
    scriptData,
    isLoading,
    updateScriptData,
    isUpdating
  } = useScriptData(projectId);
  
  // Load script data from the server ONLY on initial load
  const initialDataLoadedRef = useRef(false);
  
  // This effect only runs once when scriptData becomes available
  useEffect(() => {
    // Only load data from server once and when scriptData is available
    if (scriptData && !initialDataLoadedRef.current) {
      initialDataLoadedRef.current = true;
      
      // Type assertions to handle the unknown types from the database
      if (Array.isArray(scriptData.spreadsheetData)) {
        setSpreadsheetData(scriptData.spreadsheetData as SpreadsheetRow[]);
      }
    }
  }, [scriptData]);
  
  // Save data to server - debounced
  const saveDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const saveData = () => {
    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
    }
    
    saveDebounceTimer.current = setTimeout(() => {
      updateScriptData({
        spreadsheetData,
        scriptContent: scriptData?.scriptContent || "<p>Enter your script here...</p>",
        finalContent: scriptData?.finalContent || "<p>Final formatted content will appear here...</p>",
        correlations: scriptData?.correlations || [] as ScriptCorrelation[]
      });
    }, 1000); // 1 second debounce
  };
  
  // Handle adding new row to spreadsheet
  const addSpreadsheetRow = () => {
    const newRowId = spreadsheetData.length + 1;
    setSpreadsheetData([
      ...spreadsheetData, 
      { 
        id: newRowId, 
        generalData: "", 
        shotNumber: newRowId, 
        shotData1: "", 
        shotData2: "", 
        shotData3: "", 
        shotData4: "", 
        hasCorrelation: false 
      }
    ]);
    saveData();
  };
  
  // Handle cell update in spreadsheet
  const updateCell = (rowId: number, field: string, value: string) => {
    const updatedData = spreadsheetData.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    );
    setSpreadsheetData(updatedData);
    saveData();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Shot Data Spreadsheet</h3>
        <Button onClick={addSpreadsheetRow} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
      </div>
      
      <div className="border rounded-md overflow-hidden">
        <div className="bg-neutral-100 p-2 font-medium text-sm">Shot Data</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-neutral-50">
                <th className="border p-2 text-left">Scene</th>
                <th className="border p-2 text-left">Shot #</th>
                <th className="border p-2 text-left">Slug</th>
                <th className="border p-2 text-left">On-Screen</th>
                <th className="border p-2 text-left">Cam. Op.</th>
                <th className="border p-2 text-left">Location</th>
                <th className="border p-2 text-left">Linked</th>
              </tr>
            </thead>
            <tbody>
              {spreadsheetData.map((row) => (
                <tr key={row.id}>
                  <td className="border p-2">
                    <Input 
                      value={row.generalData} 
                      onChange={(e) => updateCell(row.id, 'generalData', e.target.value)}
                      className="border-0 h-8 p-1"
                    />
                  </td>
                  <td className="border p-2 text-center">{row.shotNumber}</td>
                  <td className="border p-2">
                    <Input 
                      value={row.shotData1} 
                      onChange={(e) => updateCell(row.id, 'shotData1', e.target.value)}
                      className="border-0 h-8 p-1"
                    />
                  </td>
                  <td className="border p-2">
                    <Input 
                      value={row.shotData2} 
                      onChange={(e) => updateCell(row.id, 'shotData2', e.target.value)}
                      className="border-0 h-8 p-1"
                    />
                  </td>
                  <td className="border p-2">
                    <Input 
                      value={row.shotData3} 
                      onChange={(e) => updateCell(row.id, 'shotData3', e.target.value)}
                      className="border-0 h-8 p-1"
                    />
                  </td>
                  <td className="border p-2">
                    <Input 
                      value={row.shotData4} 
                      onChange={(e) => updateCell(row.id, 'shotData4', e.target.value)}
                      className="border-0 h-8 p-1"
                    />
                  </td>
                  <td className="border p-2 text-center">
                    {row.hasCorrelation ? (
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-800">
                        ✓
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-gray-400">
                        -
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}