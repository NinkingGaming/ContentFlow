import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useScriptData } from "@/hooks/use-script-data";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link,
  Save,
  RefreshCcw,
  ArrowDownToLine
} from "lucide-react";
import { ScriptCorrelation, SpreadsheetRow } from "@shared/schema";

export function ScriptTabContent({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const [scriptContent, setScriptContent] = useState("<p>Enter your script here...</p>");
  const [finalContent, setFinalContent] = useState("<p>Final formatted content will appear here...</p>");
  const [correlations, setCorrelations] = useState<ScriptCorrelation[]>([]);
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetRow[]>([]);
  
  const scriptEditorRef = useRef<HTMLDivElement>(null);
  const finalEditorRef = useRef<HTMLDivElement>(null);
  
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
      
      // Set all the local state from the server data
      setScriptContent(scriptData.scriptContent);
      setFinalContent(scriptData.finalContent || "<p>Final formatted content will appear here...</p>");
      
      // Type assertions to handle the unknown types from the database
      if (Array.isArray(scriptData.correlations)) {
        setCorrelations(scriptData.correlations as ScriptCorrelation[]);
      }
      
      if (Array.isArray(scriptData.spreadsheetData)) {
        setSpreadsheetData(scriptData.spreadsheetData as SpreadsheetRow[]);
      }
      
      // Update the editor contents
      if (scriptEditorRef.current) {
        scriptEditorRef.current.innerHTML = scriptData.scriptContent;
      }
      if (finalEditorRef.current) {
        finalEditorRef.current.innerHTML = scriptData.finalContent || "<p>Final formatted content will appear here...</p>";
      }
    }
  }, [scriptData]);
  
  // Debounce timer for user input before saving
  const saveDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Function to save data to server
  const saveData = () => {
    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
    }
    
    saveDebounceTimer.current = setTimeout(() => {
      updateScriptData({
        scriptContent,
        finalContent,
        correlations: Array.isArray(correlations) ? correlations : [],
        spreadsheetData: Array.isArray(spreadsheetData) ? spreadsheetData : []
      });
    }, 1000); // 1 second debounce
  };
  
  // Handle text formatting in the rich text editor
  const formatText = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    saveData();
  };
  
  // Handle script content changes
  const handleScriptContentChange = () => {
    if (scriptEditorRef.current) {
      setScriptContent(scriptEditorRef.current.innerHTML);
      saveData();
    }
  };
  
  // Handle final content changes
  const handleFinalContentChange = () => {
    if (finalEditorRef.current) {
      setFinalContent(finalEditorRef.current.innerHTML);
      saveData();
    }
  };

  // Generate correlated script content from Micro tab data
  const generateCorrelatedScript = () => {
    if (correlations.length === 0) {
      toast({
        title: "No Correlations Found",
        description: "Please create correlations in the Micro tab first.",
        variant: "destructive"
      });
      return;
    }

    // Sort correlations by shot number for consistency
    const sortedCorrelations = [...correlations].sort((a, b) => a.shotNumber - b.shotNumber);
    
    // Generate HTML for script with correlations displayed with dividers
    let correlatedScript = "<div class='correlated-script'>";
    
    // Group correlations by shot number
    const correlationsByShot: Record<number, ScriptCorrelation[]> = {};
    sortedCorrelations.forEach(corr => {
      if (!correlationsByShot[corr.shotNumber]) {
        correlationsByShot[corr.shotNumber] = [];
      }
      correlationsByShot[corr.shotNumber].push(corr);
    });
    
    // Generate content with shot divisions
    Object.keys(correlationsByShot).forEach((shotNumber, index) => {
      const shotData = spreadsheetData.find(row => row.shotNumber === parseInt(shotNumber));
      const shotCorrelations = correlationsByShot[parseInt(shotNumber)];
      
      correlatedScript += `
        <div class="shot-section mb-4 ${index > 0 ? 'pt-4 border-t border-gray-200' : ''}">
          <div class="shot-header bg-gray-100 p-2 rounded-t text-sm">
            <strong>Shot ${shotNumber}</strong>${shotData ? ` - ${shotData.generalData}` : ''}
          </div>
          <div class="shot-content p-3">
      `;
      
      shotCorrelations.forEach(corr => {
        correlatedScript += `<p class="mb-2">${corr.text}</p>`;
      });
      
      correlatedScript += `
          </div>
        </div>
      `;
    });
    
    correlatedScript += "</div>";
    
    setScriptContent(correlatedScript);
    if (scriptEditorRef.current) {
      scriptEditorRef.current.innerHTML = correlatedScript;
    }
    
    saveData();
    
    toast({
      title: "Script Generated",
      description: "Correlated script has been generated successfully.",
    });
  };

  // Generate final content with shot details and correlated text
  const generateFinalWithShots = () => {
    if (correlations.length === 0 || spreadsheetData.length === 0) {
      toast({
        title: "Missing Data",
        description: "Please ensure you have shot data and correlations available.",
        variant: "destructive"
      });
      return;
    }

    // Sort correlations by shot number
    const sortedCorrelations = [...correlations].sort((a, b) => a.shotNumber - b.shotNumber);
    
    // Generate HTML for final output with detailed shot information
    let finalOutput = "<div class='final-output'>";
    
    // Group correlations by shot number
    const correlationsByShot: Record<number, ScriptCorrelation[]> = {};
    sortedCorrelations.forEach(corr => {
      if (!correlationsByShot[corr.shotNumber]) {
        correlationsByShot[corr.shotNumber] = [];
      }
      correlationsByShot[corr.shotNumber].push(corr);
    });
    
    // Generate content with shot details and text
    Object.keys(correlationsByShot).forEach((shotNumber, index) => {
      const shotData = spreadsheetData.find(row => row.shotNumber === parseInt(shotNumber));
      const shotCorrelations = correlationsByShot[parseInt(shotNumber)];
      
      finalOutput += `
        <div class="shot-container mb-6 ${index > 0 ? 'pt-4 border-t border-gray-200' : ''}">
          <div class="shot-header bg-gray-100 p-3 rounded-t font-medium">
            <strong>Shot ${shotNumber}</strong>${shotData ? ` - ${shotData.generalData}` : ''}
          </div>
          <div class="shot-details p-3 border border-gray-200 bg-gray-50">
            ${shotData ? `
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div><strong>Slug:</strong> ${shotData.shotData1}</div>
                <div><strong>On-Screen:</strong> ${shotData.shotData2}</div>
                <div><strong>Cam. Op.:</strong> ${shotData.shotData3}</div>
                <div><strong>Location:</strong> ${shotData.shotData4}</div>
              </div>
            ` : '<div>No shot details available</div>'}
          </div>
          <div class="shot-script p-4 border-l-4 border-blue-500 bg-blue-50 rounded-b">
      `;
      
      shotCorrelations.forEach(corr => {
        finalOutput += `<p class="mb-2">${corr.text}</p>`;
      });
      
      finalOutput += `
          </div>
        </div>
      `;
    });
    
    finalOutput += "</div>";
    
    setFinalContent(finalOutput);
    if (finalEditorRef.current) {
      finalEditorRef.current.innerHTML = finalOutput;
    }
    
    saveData();
    
    toast({
      title: "Final Generated",
      description: "Final script with shot details has been generated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Script Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Script</h3>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateCorrelatedScript}
                className="flex items-center"
              >
                <RefreshCcw className="h-4 w-4 mr-1" />
                Load Micro Content
              </Button>
              <div className="flex space-x-1">
                <Button variant="outline" size="icon" onClick={() => formatText('bold')}>
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => formatText('italic')}>
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => formatText('underline')}>
                  <Underline className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => formatText('justifyLeft')}>
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => formatText('justifyCenter')}>
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => formatText('justifyRight')}>
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div
            ref={scriptEditorRef}
            contentEditable
            className="border rounded-md p-4 min-h-[350px] focus:outline-none focus:ring-2 focus:ring-primary overflow-y-auto"
            onInput={handleScriptContentChange}
            dangerouslySetInnerHTML={{ __html: scriptContent }}
          />
        </div>
        
        {/* Final Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Final</h3>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateFinalWithShots}
                className="flex items-center"
              >
                <ArrowDownToLine className="h-4 w-4 mr-1" />
                Generate Final
              </Button>
              <div className="flex space-x-1">
                <Button variant="outline" size="icon" onClick={() => formatText('bold')}>
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => formatText('italic')}>
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => formatText('underline')}>
                  <Underline className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => formatText('justifyLeft')}>
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => formatText('justifyCenter')}>
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => formatText('justifyRight')}>
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div
            ref={finalEditorRef}
            contentEditable
            className="border rounded-md p-4 min-h-[350px] focus:outline-none focus:ring-2 focus:ring-primary overflow-y-auto"
            onInput={handleFinalContentChange}
            dangerouslySetInnerHTML={{ __html: finalContent }}
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button onClick={saveData}>
          <Save className="h-4 w-4 mr-2" />
          Save Script
        </Button>
      </div>
    </div>
  );
}