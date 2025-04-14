import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, PenTool, Lightbulb, FileEdit, Table } from "lucide-react";
import { useScriptData } from "@/hooks/use-script-data";
import { AuthProvider } from "@/lib/auth";
import { ScriptTab } from "@/components/script-tab";

export function WriteTab({ projectId }: { projectId: number }) {
  const [activeWriteTab, setActiveWriteTab] = useState("sheet");

  return (
    <div className="space-y-4">
      <div className="flex flex-col">
        <h2 className="text-2xl font-bold mb-4">Writing & Script Management</h2>
        
        <Tabs value={activeWriteTab} onValueChange={setActiveWriteTab} className="w-full">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="sheet" className="flex items-center">
              <Table className="h-4 w-4 mr-2" />
              Sheet
            </TabsTrigger>
            <TabsTrigger value="micro" className="flex items-center">
              <Lightbulb className="h-4 w-4 mr-2" />
              Micro
            </TabsTrigger>
            <TabsTrigger value="script" className="flex items-center">
              <PenTool className="h-4 w-4 mr-2" />
              Script
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center">
              <FileEdit className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="sheet" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <AuthProvider>
                  <ScriptTab projectId={projectId} initialTab="sheet" />
                </AuthProvider>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="micro" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <AuthProvider>
                  <ScriptTab projectId={projectId} initialTab="micro" />
                </AuthProvider>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="script" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <AuthProvider>
                  <ScriptTab projectId={projectId} initialTab="script" />
                </AuthProvider>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <AuthProvider>
                  <ScriptTab projectId={projectId} initialTab="documents" />
                </AuthProvider>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}