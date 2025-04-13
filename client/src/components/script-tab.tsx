import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilePicker } from "@/components/files-tab";
import { apiRequest } from "@/lib/queryClient";
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
  Plus,
  Save,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Send,
  Camera,
  FileVideo
} from "lucide-react";

// Mock data types - these would be defined in the shared schema in a real implementation
interface ScriptData {
  id?: number;
  projectId: number;
  content: string;
  correlations: ScriptCorrelation[];
  spreadsheetData: SpreadsheetRow[];
  finalContent: string;
}

interface ScriptCorrelation {
  textId: string;
  shotNumber: number;
  text: string;
}

interface SpreadsheetRow {
  id: number;
  generalData: string;
  shotNumber: number;
  shotData1: string;
  shotData2: string;
  shotData3: string;
  shotData4: string;
  hasCorrelation: boolean;
}

export function ScriptTab({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("script");
  const [scriptContent, setScriptContent] = useState("<p>Enter your script here...</p>");
  const [finalContent, setFinalContent] = useState("<p>Final formatted content will appear here...</p>");
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetRow[]>([
    { id: 1, generalData: "", shotNumber: 1, shotData1: "", shotData2: "", shotData3: "", shotData4: "", hasCorrelation: false }
  ]);
  const [correlations, setCorrelations] = useState<ScriptCorrelation[]>([]);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [selectedText, setSelectedText] = useState("");
  const [correlationDialogOpen, setCorrelationDialogOpen] = useState(false);
  const [shotForCorrelation, setShotForCorrelation] = useState<number | null>(null);
  
  const scriptEditorRef = useRef<HTMLDivElement>(null);
  const microEditorRef = useRef<HTMLDivElement>(null);
  const finalEditorRef = useRef<HTMLDivElement>(null);
  
  // Mock save function (would use useMutation in real implementation)
  const saveDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  const saveData = () => {
    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
    }
    
    saveDebounceTimer.current = setTimeout(() => {
      // In a real implementation, this would save to the backend
      toast({
        title: "Saved",
        description: "Your changes have been saved.",
      });
    }, 2000);
  };

  // Handle text formatting in the rich text editor
  const formatText = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    saveData();
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
  
  // Handle script content changes
  const handleScriptContentChange = () => {
    if (scriptEditorRef.current) {
      setScriptContent(scriptEditorRef.current.innerHTML);
      saveData();
    }
  };
  
  // Handle correlation of text with shot
  const handleCorrelateText = () => {
    if (window.getSelection) {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        setSelectedText(selection.toString());
        setCorrelationDialogOpen(true);
      } else {
        toast({
          title: "No Text Selected",
          description: "Please select some text to correlate with a shot.",
          variant: "destructive"
        });
      }
    }
  };
  
  // Create correlation between text and shot
  const createCorrelation = () => {
    if (shotForCorrelation !== null && selectedText) {
      const textId = `text-${Date.now()}`;
      const newCorrelation: ScriptCorrelation = {
        textId,
        shotNumber: shotForCorrelation,
        text: selectedText,
      };
      
      setCorrelations([...correlations, newCorrelation]);
      
      // Mark the shot as having correlation
      const updatedData = spreadsheetData.map(row => 
        row.shotNumber === shotForCorrelation ? { ...row, hasCorrelation: true } : row
      );
      setSpreadsheetData(updatedData);
      
      // Apply highlighting in script content (in a real implementation, this would be more robust)
      if (scriptEditorRef.current) {
        const highlightedContent = scriptContent.replace(
          selectedText,
          `<span class="text-blue-500 cursor-pointer" data-text-id="${textId}" data-shot="${shotForCorrelation}">${selectedText}</span>`
        );
        setScriptContent(highlightedContent);
        scriptEditorRef.current.innerHTML = highlightedContent;
      }
      
      setCorrelationDialogOpen(false);
      setShotForCorrelation(null);
      setSelectedText("");
      saveData();
    }
  };
  
  // Navigate between shots in Micro tab
  const navigateShot = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentShotIndex > 0) {
      setCurrentShotIndex(currentShotIndex - 1);
    } else if (direction === 'next' && currentShotIndex < spreadsheetData.length - 1) {
      setCurrentShotIndex(currentShotIndex + 1);
    }
  };
  
  // Find the next shot without correlation
  const findUncorrelatedShot = () => {
    const uncorrelatedShot = spreadsheetData.find(row => !row.hasCorrelation);
    if (uncorrelatedShot) {
      const index = spreadsheetData.findIndex(row => row.id === uncorrelatedShot.id);
      setCurrentShotIndex(index);
    } else {
      toast({
        title: "No Uncorrelated Shots",
        description: "All shots have been correlated with script text.",
      });
    }
  };
  
  // Send current shot to final
  const sendToFinal = () => {
    const currentShot = spreadsheetData[currentShotIndex];
    const shotCorrelations = correlations.filter(corr => corr.shotNumber === currentShot.shotNumber);
    
    let shotContent = `<div class="shot-container mb-4">
      <div class="shot-header bg-gray-100 p-2 rounded-t">
        <strong>Shot ${currentShot.shotNumber}</strong> - ${currentShot.generalData}
      </div>
      <div class="shot-details p-2 border border-gray-200 rounded-b">
        <div>${currentShot.shotData1}</div>
        <div>${currentShot.shotData2}</div>
        <div>${currentShot.shotData3}</div>
        <div>${currentShot.shotData4}</div>
      </div>
      <div class="shot-script p-3 border-l-4 border-blue-500 mt-2 bg-blue-50">`;
    
    shotCorrelations.forEach(corr => {
      shotContent += `<div>${corr.text}</div>`;
    });
    
    shotContent += `</div></div>`;
    
    setFinalContent(finalContent + shotContent);
    if (finalEditorRef.current) {
      finalEditorRef.current.innerHTML = finalContent + shotContent;
    }
    
    saveData();
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Script Management</h2>
        <Button onClick={saveData}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
      
      <Separator />
      
      {/* Spreadsheet section */}
      <div className="border rounded-md overflow-hidden">
        <div className="bg-neutral-100 p-2 font-medium text-sm">Shot Data</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-neutral-50">
                <th className="border p-2 text-left">General</th>
                <th className="border p-2 text-left">Shot #</th>
                <th className="border p-2 text-left">Shot Data 1</th>
                <th className="border p-2 text-left">Shot Data 2</th>
                <th className="border p-2 text-left">Shot Data 3</th>
                <th className="border p-2 text-left">Shot Data 4</th>
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
                    {row.hasCorrelation && (
                      <span 
                        className="cursor-pointer text-blue-500" 
                        onClick={() => {
                          setCurrentShotIndex(spreadsheetData.findIndex(r => r.id === row.id));
                          setActiveTab("micro");
                        }}
                      >
                        📝
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t">
          <Button variant="outline" size="sm" onClick={addSpreadsheetRow}>
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>
        </div>
      </div>
      
      {/* Script editor tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="script">Script</TabsTrigger>
          <TabsTrigger value="micro">Micro</TabsTrigger>
          <TabsTrigger value="final">Final</TabsTrigger>
        </TabsList>
        
        {/* Script Tab */}
        <TabsContent value="script" className="space-y-4">
          <div className="flex flex-wrap gap-1 border-b pb-2">
            <Button variant="outline" size="sm" onClick={() => formatText('bold')}>
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => formatText('italic')}>
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => formatText('underline')}>
              <Underline className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => formatText('justifyLeft')}>
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => formatText('justifyCenter')}>
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => formatText('justifyRight')}>
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => formatText('insertUnorderedList')}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => formatText('insertOrderedList')}>
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleCorrelateText()}>
              <Camera className="h-4 w-4 mr-1" />
              Correlate
            </Button>
          </div>
          
          <div
            ref={scriptEditorRef}
            contentEditable
            onInput={handleScriptContentChange}
            className="min-h-[400px] border rounded p-4 focus:outline-none focus:ring-2 focus:ring-primary"
            dangerouslySetInnerHTML={{ __html: scriptContent }}
          />
        </TabsContent>
        
        {/* Micro Tab */}
        <TabsContent value="micro" className="space-y-4">
          <div className="flex items-center space-x-2 border-b pb-3">
            <Button variant="outline" size="sm" onClick={() => navigateShot('prev')} disabled={currentShotIndex === 0}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Select 
              value={currentShotIndex.toString()} 
              onValueChange={(value) => setCurrentShotIndex(parseInt(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select shot" />
              </SelectTrigger>
              <SelectContent>
                {spreadsheetData.map((row, index) => (
                  <SelectItem key={row.id} value={index.toString()}>
                    Shot {row.shotNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => navigateShot('next')} disabled={currentShotIndex === spreadsheetData.length - 1}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={findUncorrelatedShot}>
              <Plus className="h-4 w-4 mr-1" />
              Add Shot
            </Button>
            <Button variant="outline" size="sm" onClick={sendToFinal}>
              <Send className="h-4 w-4 mr-1" />
              Send to Final
            </Button>
          </div>
          
          {spreadsheetData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Shot {spreadsheetData[currentShotIndex]?.shotNumber} Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="generalData">General Data</Label>
                      <Input 
                        id="generalData"
                        value={spreadsheetData[currentShotIndex]?.generalData || ''} 
                        onChange={(e) => updateCell(spreadsheetData[currentShotIndex].id, 'generalData', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="shotData1">Shot Data 1</Label>
                      <Input 
                        id="shotData1"
                        value={spreadsheetData[currentShotIndex]?.shotData1 || ''} 
                        onChange={(e) => updateCell(spreadsheetData[currentShotIndex].id, 'shotData1', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="shotData2">Shot Data 2</Label>
                      <Input 
                        id="shotData2"
                        value={spreadsheetData[currentShotIndex]?.shotData2 || ''} 
                        onChange={(e) => updateCell(spreadsheetData[currentShotIndex].id, 'shotData2', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="shotData3">Shot Data 3</Label>
                      <Input 
                        id="shotData3"
                        value={spreadsheetData[currentShotIndex]?.shotData3 || ''} 
                        onChange={(e) => updateCell(spreadsheetData[currentShotIndex].id, 'shotData3', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="shotData4">Shot Data 4</Label>
                      <Input 
                        id="shotData4"
                        value={spreadsheetData[currentShotIndex]?.shotData4 || ''} 
                        onChange={(e) => updateCell(spreadsheetData[currentShotIndex].id, 'shotData4', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Correlated Text</CardTitle>
                  <CardDescription>
                    Text from the script correlated with this shot
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded p-3 min-h-[200px]">
                    {correlations
                      .filter(corr => corr.shotNumber === spreadsheetData[currentShotIndex]?.shotNumber)
                      .map((corr, index) => (
                        <div key={corr.textId} className="mb-2 pb-2 border-b last:border-0">
                          <p>{corr.text}</p>
                        </div>
                      ))}
                    {!spreadsheetData[currentShotIndex]?.hasCorrelation && (
                      <p className="text-muted-foreground">No correlated text for this shot</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        {/* Final Tab */}
        <TabsContent value="final" className="space-y-4">
          <div className="flex flex-wrap gap-1 border-b pb-2">
            <Button variant="outline" size="sm" onClick={() => formatText('bold')}>
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => formatText('italic')}>
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => formatText('underline')}>
              <Underline className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => formatText('justifyLeft')}>
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => formatText('justifyCenter')}>
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => formatText('justifyRight')}>
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div
            ref={finalEditorRef}
            contentEditable
            className="min-h-[400px] border rounded p-4 focus:outline-none focus:ring-2 focus:ring-primary"
            dangerouslySetInnerHTML={{ __html: finalContent }}
          />
        </TabsContent>
      </Tabs>
      
      {/* Correlation Dialog */}
      <Dialog open={correlationDialogOpen} onOpenChange={setCorrelationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correlate Text with Shot</DialogTitle>
            <DialogDescription>
              Select a shot number to associate with the selected text.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="shotNumber">Shot Number</Label>
            <Select 
              value={shotForCorrelation?.toString() || ''} 
              onValueChange={(value) => setShotForCorrelation(parseInt(value))}
            >
              <SelectTrigger id="shotNumber">
                <SelectValue placeholder="Select shot" />
              </SelectTrigger>
              <SelectContent>
                {spreadsheetData.map((row) => (
                  <SelectItem key={row.id} value={row.shotNumber.toString()}>
                    Shot {row.shotNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="mt-4 p-3 border rounded bg-neutral-50">
              <p className="text-sm font-medium">Selected Text:</p>
              <p className="mt-1">{selectedText}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrelationDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createCorrelation} disabled={shotForCorrelation === null}>
              Create Correlation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}