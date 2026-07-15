import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, Layers, Plus, Edit, Trash2, Search, GripVertical } from "lucide-react";
import { useClub } from "@/context/ClubContext";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/app/Button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Court } from "@/data/seed";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export const Route = createFileRoute("/_authenticated/courts")({
  head: () => ({
    meta: [
      { title: "Courts — Settings" },
      { name: "description", content: "Manage club courts and facilities." },
    ],
  }),
  component: CourtsPage,
});

function CourtsPage() {
  const { state, dispatch } = useClub();
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isEditing, setIsEditing] = useState<Court | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const courts = state.courts;

  const filteredCourts = useMemo(() => {
    if (!searchQuery) return courts;
    return courts.filter((c) => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.surface.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [courts, searchQuery]);

  const toggleStatus = (court: Court) => {
    const newStatus = court.status === "active" ? "disabled" : "active";
    dispatch({ type: "update_court", court: { ...court, status: newStatus } });
    toast.success(`Court ${newStatus === "active" ? "enabled" : "disabled"}`);
  };

  const handleDelete = (courtId: string) => {
    dispatch({ type: "delete_court", courtId });
    setDeleteConfirm(null);
    toast.success("Court deleted successfully");
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(filteredCourts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update displayOrder for all courts
    const reorderedCourts = items.map((court, index) => ({
      ...court,
      displayOrder: index + 1,
    }));

    dispatch({ type: "reorder_courts", courts: reorderedCourts });
    toast.success("Court order updated");
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const residentPrice = Number(formData.get("residentPrice"));
    const outsiderPrice = Number(formData.get("outsiderPrice"));

    if (residentPrice < 0 || outsiderPrice < 0) {
      toast.error("Prices cannot be negative.");
      return;
    }

    const name = formData.get("name") as string;
    
    // Check for unique name
    const existingCourt = state.courts.find(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== (isEditing?.id || ""));
    if (existingCourt) {
      toast.error(`A court named "${name}" already exists.`);
      return;
    }

    const courtData: Court = {
      id: isEditing ? isEditing.id : `C-${crypto.randomUUID().slice(0, 8)}`,
      name: formData.get("name") as string,
      location: formData.get("location") as string,
      surface: formData.get("surface") as "Indoor" | "Outdoor",
      residentPrice,
      outsiderPrice,
      status: (formData.get("status") as "active" | "maintenance" | "disabled") || "active",
      courtColor: formData.get("courtColor") as string,
    };

    if (isEditing) {
      dispatch({ type: "update_court", court: courtData });
      setIsEditing(null);
      toast.success("Court updated successfully");
    } else {
      dispatch({ type: "add_court", court: courtData });
      setIsAdding(false);
      toast.success("Court added successfully");
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Court Management"
        description="Single source of truth for all courts."
        actions={
          <Button variant="clay" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Court
          </Button>
        }
      />

      <div className="mt-6 flex flex-col gap-4">
        {/* Search */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
          <input
            type="text"
            placeholder="Search courts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-line bg-card text-sm text-ink focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
        </div>

        {/* Courts Grid with Drag & Drop */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="courts">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {filteredCourts.map((court, index) => (
                  <Draggable key={court.id} draggableId={court.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "rounded-xl border bg-card p-4 shadow-sm flex flex-col transition-all",
                          snapshot.isDragging ? "border-clay shadow-lg rotate-1" : "border-line hover:border-line-soft hover:shadow-md"
                        )}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="flex items-center justify-between mb-3 cursor-move"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-ink-mute" />
                            <div 
                              className="w-4 h-4 rounded-full shadow-inner border border-line"
                              style={{ backgroundColor: court.courtColor || '#ccc' }}
                            />
                            <h3 className="font-display font-semibold text-ink line-clamp-1">
                              {court.name}
                            </h3>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                              court.status === "active"
                                ? "bg-status-available/20 text-status-available-fg"
                                : court.status === "maintenance"
                                  ? "bg-status-cancelled/20 text-status-cancelled-fg"
                                  : "bg-line text-ink-mute"
                            )}
                          >
                            {court.status}
                          </span>
                        </div>

                        <div className="text-sm text-ink-mute mb-4 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {court.location || "No Location"} ({court.surface})
                          </div>
                          <div>Res: Rs {court.residentPrice}/hr</div>
                          <div>Out: Rs {court.outsiderPrice}/hr</div>
                        </div>

                        <div className="mt-auto flex items-center gap-2 pt-4 border-t border-line-soft">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex-1 text-xs" 
                            onClick={() => setIsEditing(court)}
                          >
                            <Edit className="h-3 w-3 mr-1.5" />
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex-1 text-xs"
                            onClick={() => toggleStatus(court)}
                          >
                            {court.status === "active" ? "Disable" : "Enable"}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-status-cancelled-fg hover:bg-status-cancelled/10 hover:text-status-cancelled-fg"
                            onClick={() => setDeleteConfirm(court.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-line bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-ink mb-2">Delete Court?</h3>
            <p className="text-sm text-ink-mute mb-6">
              Are you sure you want to delete this court? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="primary" className="bg-status-cancelled text-white border-status-cancelled hover:bg-status-cancelled/90" onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      {(isEditing || isAdding) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-line bg-card shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-line px-6 py-4 flex items-center justify-between sticky top-0 bg-card z-10">
              <h3 className="text-lg font-semibold text-ink">
                {isEditing ? "Edit Court" : "Add Court"}
              </h3>
              <button 
                className="text-ink-mute hover:text-ink"
                onClick={() => { setIsEditing(null); setIsAdding(false); }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <label className="block">
                <span className="block text-sm font-medium text-ink mb-1">Court Name *</span>
                <input
                  required
                  name="name"
                  defaultValue={isEditing?.name}
                  className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-ink mb-1">Location</span>
                <input
                  name="location"
                  defaultValue={isEditing?.location}
                  className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-ink mb-1">Type</span>
                  <select
                    name="surface"
                    defaultValue={isEditing?.surface || "Indoor"}
                    className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
                  >
                    <option value="Indoor">Indoor</option>
                    <option value="Outdoor">Outdoor</option>
                  </select>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-ink mb-1">Status</span>
                  <select
                    name="status"
                    defaultValue={isEditing?.status || "active"}
                    className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-ink mb-1">Resident Rate/hr *</span>
                  <input
                    required
                    type="number"
                    min="0"
                    name="residentPrice"
                    defaultValue={isEditing?.residentPrice}
                    className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-ink mb-1">Outsider Rate/hr *</span>
                  <input
                    required
                    type="number"
                    min="0"
                    name="outsiderPrice"
                    defaultValue={isEditing?.outsiderPrice}
                    className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-sm font-medium text-ink mb-1">Court Color</span>
                <div className="flex gap-2">
                  <input
                    type="color"
                    name="courtColor"
                    defaultValue={isEditing?.courtColor || "#3b82f6"}
                    className="h-9 w-12 cursor-pointer rounded-md border border-line bg-card"
                  />
                  <span className="text-xs text-ink-mute self-center">Used in calendar views</span>
                </div>
              </label>

              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-card">
                <Button variant="ghost" type="button" onClick={() => { setIsEditing(null); setIsAdding(false); }}>
                  Cancel
                </Button>
                <Button variant="clay" type="submit">
                  {isEditing ? "Save Changes" : "Add Court"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}