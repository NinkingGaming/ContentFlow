import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useScriptData } from "@/hooks/use-script-data";
import { ChevronLeft, ChevronRight, PenTool } from "lucide-react";
import { SpreadsheetRow, ScriptCorrelation } from "@shared/schema";

export function MicroTabContent({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetRow[]>([
    { id: 1, generalData: "", shotNumber: 1, shotData1: "", shotData2: "", shotData3: "", shotData4: "", hasCorrelation: false }
  ]);
  const [correlations, setCorrelations] = useState<ScriptCorrelation[]>([]);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [scriptContent, setScriptContent] = useState("<p>Enter your script here...</p>");
  
  const microEditorRef = useRef<HTMLTextAreaElement>(null);
  
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
      
      setScriptContent(scriptData.scriptContent);
      
      // Type assertions to handle the unknown types from the database
      if (Array.isArray(scriptData.spreadsheetData)) {
        setSpreadsheetData(scriptData.spreadsheetData as SpreadsheetRow[]);
      }
      
      if (Array.isArray(scriptData.correlations)) {
        setCorrelations(scriptData.correlations as ScriptCorrelation[]);
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
        scriptContent,
        finalContent: scriptData?.finalContent || "<p>Final formatted content will appear here...</p>",
        correlations
      });
    }, 1000); // 1 second debounce
  };
  
  // Navigate between shots in Micro tab
  const navigateShot = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentShotIndex > 0) {
      setCurrentShotIndex(currentShotIndex - 1);
    } else if (direction === 'next' && currentShotIndex < spreadsheetData.length - 1) {
      setCurrentShotIndex(currentShotIndex + 1);
    }
  };
  
  // Find the next shot without correlation and create a new correlation for it
  const findUncorrelatedShot = () => {
    const uncorrelatedShot = spreadsheetData.find(row => !row.hasCorrelation);
    if (uncorrelatedShot) {
      const index = spreadsheetData.findIndex(row => row.id === uncorrelatedShot.id);
      setCurrentShotIndex(index);
      
      // Create a new empty correlation for this shot
      const textId = `text-${Date.now()}`;
      const newCorrelation: ScriptCorrelation = {
        textId,
        shotNumber: uncorrelatedShot.shotNumber,
        text: "Enter your text for this shot here...",
      };
      
      // Update correlations state with the new correlation
      const newCorrelations = [...correlations, newCorrelation];
      setCorrelations(newCorrelations);
      
      // Mark the shot as having correlation
      const updatedData = spreadsheetData.map(row => 
        row.shotNumber === uncorrelatedShot.shotNumber ? { ...row, hasCorrelation: true } : row
      );
      setSpreadsheetData(updatedData);
      
      // Update content with new correlation
      const updatedContent = scriptContent + `<p><span class="text-blue-500 cursor-pointer" data-text-id="${textId}" data-shot="${uncorrelatedShot.shotNumber}">Enter your text for this shot here...</span></p>`;
      setScriptContent(updatedContent);
      
      // Save the updated script data
      saveData();
    } else {
      toast({
        title: "No Uncorrelated Shots",
        description: "All shots have been correlated with script text.",
      });
    }
  };
  
  // Get current shot correlations
  const getCurrentShotCorrelations = () => {
    if (spreadsheetData.length === 0) return [];
    
    const currentShot = spreadsheetData[currentShotIndex];
    return correlations.filter(corr => corr.shotNumber === currentShot.shotNumber);
  };
  
  // Update shot correlation text
  const updateShotCorrelation = (e: React.ChangeEvent<HTMLTextAreaElement>, correlation: ScriptCorrelation) => {
    const updatedCorrelations = correlations.map(corr => 
      corr.textId === correlation.textId ? { ...corr, text: e.target.value } : corr
    );
    setCorrelations(updatedCorrelations);
    saveData();
  };

  // Get current shot details
  const currentShot = spreadsheetData[currentShotIndex] || spreadsheetData[0];
  const currentCorrelations = getCurrentShotCorrelations();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Shot Text Editor</h3>
        <Button onClick={findUncorrelatedShot} size="sm" variant="outline">
          <PenTool className="h-4 w-4 mr-2" />
          Find Next Uncorrelated Shot
        </Button>
      </div>
      
      <div className="bg-gray-50 border rounded-md p-4">
        <div className="flex justify-between items-center mb-4">
          <Button 
            onClick={() => navigateShot('prev')} 
            disabled={currentShotIndex === 0}
            size="sm"
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="text-sm font-medium">
            Shot {currentShot?.shotNumber || '1'} of {spreadsheetData.length}
          </div>
          <Button 
            onClick={() => navigateShot('next')} 
            disabled={currentShotIndex >= spreadsheetData.length - 1}
            size="sm"
            variant="outline"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        <div className="bg-white border rounded-md p-3 mb-4">
          <h4 className="font-medium text-sm mb-2">Shot Details:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Scene:</strong> {currentShot?.generalData}</div>
            <div><strong>Shot #:</strong> {currentShot?.shotNumber}</div>
            <div><strong>Slug:</strong> {currentShot?.shotData1}</div>
            <div><strong>On-Screen:</strong> {currentShot?.shotData2}</div>
            <div><strong>Cam. Op.:</strong> {currentShot?.shotData3}</div>
            <div><strong>Location:</strong> {currentShot?.shotData4}</div>
          </div>
        </div>
        
        <div className="mb-2 text-sm font-medium">Shot Text:</div>
        {currentCorrelations.length > 0 ? (
          <div className="space-y-2">
            {currentCorrelations.map((corr) => (
              <div key={corr.textId} className="bg-white border rounded">
                <Textarea
                  ref={microEditorRef}
                  value={corr.text}
                  onChange={(e) => updateShotCorrelation(e, corr)}
                  placeholder="Enter text for this shot..."
                  className="min-h-[120px]"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border rounded p-4 text-center text-gray-500">
            <p>No text associated with this shot yet.</p>
            <Button 
              onClick={findUncorrelatedShot} 
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Create New Text
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}