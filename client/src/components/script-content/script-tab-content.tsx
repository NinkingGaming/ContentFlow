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
  Save
} from "lucide-react";
import { ScriptCorrelation, SpreadsheetRow } from "@shared/schema";

export function ScriptTabContent({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const [scriptContent, setScriptContent] = useState("<p>Enter your script here...</p>");
  const [finalContent, setFinalContent] = useState("<p>Final formatted content will appear here...</p>");
  
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
        correlations: scriptData?.correlations || [] as ScriptCorrelation[],
        spreadsheetData: scriptData?.spreadsheetData || [] as SpreadsheetRow[]
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Script Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Script</h3>
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
              <Button variant="outline" size="icon" onClick={() => formatText('insertUnorderedList')}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => formatText('insertOrderedList')}>
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => {
                const url = prompt('Enter URL:');
                if (url) formatText('createLink', url);
              }}>
                <Link className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div
            ref={scriptEditorRef}
            contentEditable
            className="border rounded-md p-4 min-h-[350px] focus:outline-none focus:ring-2 focus:ring-primary"
            onInput={handleScriptContentChange}
            dangerouslySetInnerHTML={{ __html: scriptContent }}
          />
        </div>
        
        {/* Final Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Final</h3>
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
              <Button variant="outline" size="icon" onClick={() => formatText('insertUnorderedList')}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => formatText('insertOrderedList')}>
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => {
                const url = prompt('Enter URL:');
                if (url) formatText('createLink', url);
              }}>
                <Link className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div
            ref={finalEditorRef}
            contentEditable
            className="border rounded-md p-4 min-h-[350px] focus:outline-none focus:ring-2 focus:ring-primary"
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