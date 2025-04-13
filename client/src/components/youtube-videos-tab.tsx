import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { YoutubeVideoForm } from "./youtube-video-form";
import { apiRequest } from "@/lib/queryClient";
import type { YoutubeVideo } from "@shared/schema";
import { PlusCircle, Edit, Trash2, Youtube } from "lucide-react";

export function YoutubeVideosTab({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [videoToEdit, setVideoToEdit] = useState<YoutubeVideo | null>(null);

  // Query to get all YouTube videos for this project
  const { data: videos, isLoading } = useQuery<YoutubeVideo[]>({
    queryKey: ['/api/projects', projectId, 'youtube-videos'],
    queryFn: () => apiRequest(`/api/projects/${projectId}/youtube-videos`),
  });

  // Mutation to delete a video
  const deleteVideoMutation = useMutation({
    mutationFn: (videoId: number) => 
      apiRequest(`/api/youtube-videos/${videoId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast({
        title: 'Video deleted',
        description: 'The video has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'youtube-videos'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete the video: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleAddVideo = () => {
    setIsAddingVideo(true);
    setVideoToEdit(null);
  };

  const handleEditVideo = (video: YoutubeVideo) => {
    setVideoToEdit(video);
    setIsAddingVideo(true);
  };

  const handleDeleteVideo = (videoId: number) => {
    if (confirm('Are you sure you want to delete this video?')) {
      deleteVideoMutation.mutate(videoId);
    }
  };

  const handleFormClose = () => {
    setIsAddingVideo(false);
    setVideoToEdit(null);
  };

  if (isAddingVideo) {
    return (
      <YoutubeVideoForm 
        projectId={projectId} 
        videoToEdit={videoToEdit} 
        onClose={handleFormClose} 
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">YouTube Videos</h2>
        <Button onClick={handleAddVideo}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Video
        </Button>
      </div>
      
      <Separator />
      
      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Loading videos...</div>
      ) : videos && videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video: YoutubeVideo) => (
            <Card key={video.id} className="transition-all hover:shadow-md">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="mb-2">{video.visibility || 'private'}</Badge>
                    <CardTitle className="text-lg">{video.title}</CardTitle>
                  </div>
                  <Youtube className="h-5 w-5 text-red-600" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {video.thumbnailUrl && (
                  <div className="mb-3 overflow-hidden rounded-md">
                    <img 
                      src={video.thumbnailUrl} 
                      alt={`Thumbnail for ${video.title}`} 
                      className="w-full aspect-video object-cover"
                    />
                  </div>
                )}
                <CardDescription className="line-clamp-3">
                  {video.description || 'No description provided'}
                </CardDescription>
                {video.tags && video.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {video.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(video.createdAt).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditVideo(video)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteVideo(video.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-muted-foreground">
          <Youtube className="mx-auto mb-2 h-10 w-10 opacity-50" />
          <p>No YouTube videos found. Add a new video to get started.</p>
        </div>
      )}
    </div>
  );
}