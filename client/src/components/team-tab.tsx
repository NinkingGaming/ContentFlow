import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus, Shield, UserCog, User, UserCheck, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { User as UserType, UserRole, UserRoleType } from "@shared/schema";

// Helper function to get role icon
function getRoleIcon(role: string) {
  switch (role) {
    case UserRole.ADMIN:
      return <Shield className="h-4 w-4 mr-1 text-red-500" />;
    case UserRole.PRODUCER:
      return <UserCog className="h-4 w-4 mr-1 text-blue-500" />;
    case UserRole.ACTOR:
      return <User className="h-4 w-4 mr-1 text-amber-500" />;
    case UserRole.EMPLOYED:
      return <UserCheck className="h-4 w-4 mr-1 text-green-500" />;
    default:
      return <User className="h-4 w-4 mr-1" />;
  }
}

// Helper function to get role color for badge
function getRoleBadgeVariant(role: string): "default" | "destructive" | "outline" | "secondary" {
  switch (role) {
    case UserRole.ADMIN:
      return "destructive";
    case UserRole.PRODUCER:
      return "default";
    case UserRole.ACTOR:
      return "secondary";
    case UserRole.EMPLOYED:
    default:
      return "outline";
  }
}

export function TeamTab() {
  const { user: currentUser } = useAuth();
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserType | null>(null);
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    refetchOnWindowFocus: false,
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: UserRoleType }) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
        credentials: 'include'
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update user role");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User role updated",
        description: "The user's role has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating user role",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        credentials: 'include'
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete user");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeletingUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include'
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to add user");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User added",
        description: "The user has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddUserDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Only allow admins to edit user roles
  const canEditRoles = currentUser?.role === UserRole.ADMIN;
  
  // Only allow mastercontrol user to delete accounts
  const canDeleteUsers = currentUser?.username === 'mastercontrol';

  // Role descriptions for tooltip
  const roleDescriptions = {
    [UserRole.ADMIN]: "Full access to all features and can manage users",
    [UserRole.PRODUCER]: "Can create and manage projects they create or are added to",
    [UserRole.ACTOR]: "Can pitch ideas on projects they are added to",
    [UserRole.EMPLOYED]: "View-only access to projects they are added to"
  };

  const AddUserForm = () => {
    const [newUser, setNewUser] = useState({
      username: "",
      displayName: "",
      email: "",
      password: "",
      role: UserRole.EMPLOYED as UserRoleType,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Generate avatar initials from display name
      const nameParts = newUser.displayName.split(" ");
      const avatarInitials = nameParts.length > 1 
        ? `${nameParts[0][0]}${nameParts[1][0]}` 
        : newUser.displayName.substring(0, 2);
      
      // Generate a random color for avatar
      const colors = ["#F43F5E", "#3B82F6", "#10B981", "#6366F1", "#F59E0B"];
      const avatarColor = colors[Math.floor(Math.random() * colors.length)];
      
      addUserMutation.mutate({
        ...newUser,
        avatarInitials: avatarInitials.toUpperCase(),
        avatarColor
      });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="displayName">Full Name</Label>
          <Input 
            id="displayName"
            value={newUser.displayName}
            onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
            required
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="username">Username</Label>
          <Input 
            id="username"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            required
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            required
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            required
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="role">Role</Label>
          <Select 
            value={newUser.role}
            onValueChange={(value) => setNewUser({ ...newUser, role: value as UserRoleType })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(UserRole).map((role) => (
                <SelectItem key={role} value={role}>
                  <div className="flex items-center">
                    {getRoleIcon(role)}
                    <span className="ml-2 capitalize">{role}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {roleDescriptions[newUser.role]}
          </p>
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setIsAddUserDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={addUserMutation.isPending}
          >
            {addUserMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add User"
            )}
          </Button>
        </DialogFooter>
      </form>
    );
  };

  const EditRoleDialog = () => {
    const [selectedRole, setSelectedRole] = useState<UserRoleType>(
      (editingUser?.role as UserRoleType) || UserRole.EMPLOYED
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingUser) {
        updateUserRoleMutation.mutate({
          userId: editingUser.id,
          role: selectedRole
        });
      }
    };

    return (
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Update the role for {editingUser?.displayName}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as UserRoleType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(UserRole).map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center">
                        {getRoleIcon(role)}
                        <span className="ml-2 capitalize">{role}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {roleDescriptions[selectedRole]}
              </p>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateUserRoleMutation.isPending}
              >
                {updateUserRoleMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Role"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  };
  
  const DeleteUserDialog = () => {
    const handleDelete = () => {
      if (deletingUser) {
        deleteUserMutation.mutate(deletingUser.id);
      }
    };
    
    return (
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the account of {deletingUser?.displayName} and remove all their data from the system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center p-3 mt-2 space-x-2 bg-red-50 text-red-900 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium">
              This is a destructive action and may affect projects this user is associated with.
            </p>
          </div>
          
          <DialogFooter className="mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeletingUser(null)}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Show role descriptions
  const RoleDescriptions = () => (
    <Card className="p-4 mb-6">
      <h3 className="text-lg font-semibold mb-3">Role Permissions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(UserRole).map(([key, role]) => (
          <div key={role} className="flex items-start space-x-2">
            <div className="mt-1">{getRoleIcon(role)}</div>
            <div>
              <Badge variant={getRoleBadgeVariant(role)} className="mb-1">
                <span className="capitalize">{role}</span>
              </Badge>
              <p className="text-sm text-muted-foreground">{roleDescriptions[role]}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Team Management</h2>
        {canEditRoles && (
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Team Member</DialogTitle>
                <DialogDescription>
                  Add a new user to the system with the appropriate permissions.
                </DialogDescription>
              </DialogHeader>
              <AddUserForm />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <RoleDescriptions />

      {/* Scrollable container for the table */}
      <div className="border rounded-md">
        {/* Table header with scrollable body */}
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                {canEditRoles && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback style={{ backgroundColor: user.avatarColor }}>
                        {user.avatarInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span>{user.displayName}</span>
                    {user.id === currentUser?.id && (
                      <Badge variant="outline" className="ml-2">You</Badge>
                    )}
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      <div className="flex items-center">
                        {getRoleIcon(user.role)}
                        <span className="capitalize">{user.role}</span>
                      </div>
                    </Badge>
                  </TableCell>
                  {canEditRoles && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setEditingUser(user)}
                          disabled={user.id === currentUser?.id} // Can't edit your own role
                        >
                          Edit Role
                        </Button>
                        {canDeleteUsers && user.id !== currentUser?.id && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeletingUser(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="p-2 text-sm text-center text-muted-foreground">
          List of all team members and their roles
        </div>
      </div>

      <EditRoleDialog />
      <DeleteUserDialog />
    </div>
  );
}