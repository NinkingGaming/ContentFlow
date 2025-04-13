import { useState } from "react";
import { ScriptTab } from "@/components/script-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, PenTool, Lightbulb, FileEdit } from "lucide-react";

export function WriteTab({ projectId }: { projectId: number }) {
  const [activeWriteTab, setActiveWriteTab] = useState("script");

  return (
    <div className="space-y-4">
      <div className="flex flex-col">
        <h2 className="text-2xl font-bold mb-4">Writing & Script Management</h2>
        
        <Tabs value={activeWriteTab} onValueChange={setActiveWriteTab} className="w-full">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="script" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Script
            </TabsTrigger>
            <TabsTrigger value="ideas" className="flex items-center">
              <Lightbulb className="h-4 w-4 mr-2" />
              Ideas
            </TabsTrigger>
            <TabsTrigger value="drafts" className="flex items-center">
              <PenTool className="h-4 w-4 mr-2" />
              Drafts
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center">
              <FileEdit className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="script" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <ScriptTab projectId={projectId} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="ideas" className="mt-4">
            <Card>
              <CardContent className="pt-6 min-h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">Idea Management</h3>
                  <p className="text-muted-foreground max-w-md">
                    This is where you'll be able to brainstorm and organize ideas for your content.
                    Feature coming soon!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="drafts" className="mt-4">
            <Card>
              <CardContent className="pt-6 min-h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <PenTool className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">Draft Management</h3>
                  <p className="text-muted-foreground max-w-md">
                    Track multiple drafts of your scripts and written content here.
                    Feature coming soon!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardContent className="pt-6 min-h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <FileEdit className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">Document Management</h3>
                  <p className="text-muted-foreground max-w-md">
                    Organize and manage all your project-related documents in one place.
                    Feature coming soon!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}