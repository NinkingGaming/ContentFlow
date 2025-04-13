import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, ArrowLeft, Upload, X, FolderOpen } from "lucide-react";
import { FilePicker } from "@/components/files-tab";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { YoutubeVideo } from "@shared/schema";

// Define the form schema with Zod
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  tags: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  visibility: z.enum(["private", "public", "unlisted"]).default("private"),
  category: z.string().optional(),
  playlist: z.string().optional(),
  scheduledPublishTime: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function YoutubeVideoForm({
  projectId,
  videoToEdit,
  onClose
}: {
  projectId: number;
  videoToEdit: YoutubeVideo | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    videoToEdit?.thumbnailUrl || null
  );
  const [isThumbnailPickerOpen, setIsThumbnailPickerOpen] = useState(false);
  const [isVideoPickerOpen, setIsVideoPickerOpen] = useState(false);

  // Configure form with default values if editing
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: videoToEdit ? {
      title: videoToEdit.title,
      description: videoToEdit.description || "",
      tags: videoToEdit.tags ? videoToEdit.tags.join(", ") : "",
      thumbnailUrl: videoToEdit.thumbnailUrl || "",
      videoUrl: videoToEdit.videoUrl || "",
      visibility: (videoToEdit.visibility as "private" | "public" | "unlisted") || "private",
      category: videoToEdit.category || "",
      playlist: videoToEdit.playlist || "",
      scheduledPublishTime: videoToEdit.scheduledPublishTime 
        ? new Date(videoToEdit.scheduledPublishTime) 
        : undefined,
    } : {
      title: "",
      description: "",
      tags: "",
      thumbnailUrl: "",
      videoUrl: "",
      visibility: "private" as const,
      category: "",
      playlist: "",
      scheduledPublishTime: undefined,
    }
  });

  // Create mutation for adding a new video
  const createMutation = useMutation({
    mutationFn: (values: FormValues) => 
      apiRequest<YoutubeVideo>('/api/youtube-videos', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          projectId
        }),
      }),
    onSuccess: () => {
      toast({
        title: 'Video created',
        description: 'The video has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'youtube-videos'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create video: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update mutation for editing an existing video
  const updateMutation = useMutation({
    mutationFn: (values: FormValues & { id: number }) => {
      const { id, ...updateData } = values;
      return apiRequest<YoutubeVideo>(`/api/youtube-videos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Video updated',
        description: 'The video has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'youtube-videos'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update video: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Handler for thumbnail URL changes
  const handleThumbnailChange = (url: string) => {
    setThumbnailPreview(url);
    form.setValue("thumbnailUrl", url);
  };

  // Handle form submission
  const onSubmit = (values: FormValues) => {
    // Extract tags and convert to array for API, but keep as string for form
    const tagsArray = values.tags ? values.tags.split(',').map(tag => tag.trim()) : [];
    
    if (videoToEdit) {
      updateMutation.mutate({ 
        ...values, 
        id: videoToEdit.id,
        // Include tags array in request body
        tags: tagsArray
      });
    } else {
      createMutation.mutate({
        ...values,
        // Include tags array in request body
        tags: tagsArray
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Button variant="ghost" onClick={onClose} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-bold">
          {videoToEdit ? "Edit YouTube Video" : "Add YouTube Video"}
        </h2>
      </div>
      
      <Separator />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Video title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Video description" 
                        rows={5}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Describe your video, include timestamps, links, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Separate tags with commas" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Example: cooking, recipe, healthy
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select visibility" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="unlisted">Unlisted</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="Video category" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="thumbnailUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thumbnail URL</FormLabel>
                    <div className="flex items-center space-x-2">
                      <FormControl className="flex-1">
                        <Input 
                          placeholder="URL to thumbnail image" 
                          value={field.value || ''}
                          onChange={(e) => handleThumbnailChange(e.target.value)}
                        />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsThumbnailPickerOpen(true)}
                      >
                        <FolderOpen className="h-4 w-4 mr-1" />
                        Browse
                      </Button>
                      {thumbnailPreview && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleThumbnailChange('')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {thumbnailPreview && (
                      <div className="mt-2 relative aspect-video overflow-hidden rounded-md border">
                        <img 
                          src={thumbnailPreview} 
                          alt="Thumbnail preview" 
                          className="object-cover w-full h-full"
                          onError={() => setThumbnailPreview(null)}
                        />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video URL</FormLabel>
                    <div className="flex items-center space-x-2">
                      <FormControl className="flex-1">
                        <Input 
                          placeholder="URL to video file" 
                          {...field} 
                        />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsVideoPickerOpen(true)}
                      >
                        <FolderOpen className="h-4 w-4 mr-1" />
                        Browse
                      </Button>
                    </div>
                    <FormDescription>
                      Will be used to upload to YouTube.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="playlist"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Playlist</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="YouTube playlist" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="scheduledPublishTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Scheduled Publish Time</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      When you want the video to be published.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                "Saving..."
              ) : videoToEdit ? (
                "Update Video"
              ) : (
                "Create Video"
              )}
            </Button>
          </div>
        </form>
      </Form>
      
      {/* Thumbnail File Picker */}
      <FilePicker
        projectId={projectId}
        isOpen={isThumbnailPickerOpen}
        onClose={() => setIsThumbnailPickerOpen(false)}
        onSelect={(file) => {
          handleThumbnailChange(file.filepath);
          setIsThumbnailPickerOpen(false);
        }}
        acceptedFileTypes={['image/*']}
      />
      
      {/* Video File Picker */}
      <FilePicker
        projectId={projectId}
        isOpen={isVideoPickerOpen}
        onClose={() => setIsVideoPickerOpen(false)}
        onSelect={(file) => {
          form.setValue('videoUrl', file.filepath);
          setIsVideoPickerOpen(false);
        }}
        acceptedFileTypes={['video/*']}
      />
    </div>
  );
}