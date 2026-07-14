"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Loader2,
  User,
  Calendar,
  Phone,
  Droplet,
  HeartPulse,
  FileText,
  Users,
  MapPin,
  UserCog,
  Upload,
  X,
  Search,
  Check,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { Student, SchoolClass } from "@/types/school.types";

const RELIGIONS = [
  "Islam",
  "Christianity",
  "Hinduism",
  "Sikhism",
  "Buddhism",
  "Parsism",
  "Ahmadiyya",
  "Other",
];

const schema = z.object({
  name: z.string().min(1, "Student name is required"),
  registration_no: z.string().optional(),
  class_id: z.string().nullable().optional(),
  date_of_admission: z.string().min(1, "Date of admission is required"),
  discount: z.string().optional(),
  mobile: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  identification_mark: z.string().optional(),
  blood_group: z.string().optional(),
  disease: z.string().optional(),
  birth_form_id: z.string().optional(),
  additional_note: z.string().optional(),
  is_orphan: z.boolean().optional(),
  is_osc: z.boolean().optional(),
  is_free: z.boolean().optional(),
  previous_balance: z.string().optional(),
  annual_dues_discount: z.string().optional(),
  previous_annual_due: z.string().optional(),
  religion: z.string().optional(),
  family: z.string().optional(),
  total_siblings: z.string().optional(),
  address: z.string().optional(),
  father_name: z.string().optional(),
  father_nic: z.string().optional(),
  father_profession: z.string().optional(),
});

export type StudentFormValues = z.infer<typeof schema>;

interface StudentFormProps {
  schoolId: string;
  initialData?: Student | null;
  onSubmit: (values: Record<string, unknown>) => Promise<Student>;
  onSuccess?: (result: Student) => void;
  submitLabel?: string;
}

async function fetchClasses(schoolId: string): Promise<SchoolClass[]> {
  const res = await fetch(`/api/classes/${schoolId}?limit=1000`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Failed to load");
  return json.data.data;
}

export function StudentForm({
  schoolId,
  initialData,
  onSubmit,
  onSuccess,
  submitLabel = "Save Student",
}: StudentFormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(
    initialData?.photo_url ?? null
  );
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const photoFileRef = React.useRef<File | null>(null);

  // Religion searchable dropdown state
  const [religionOpen, setReligionOpen] = React.useState(false);
  const [religionSearch, setReligionSearch] = React.useState("");
  const religionRef = React.useRef<HTMLDivElement>(null);
  const religionInputRef = React.useRef<HTMLInputElement>(null);

  // Photo preview for new students (before save)
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (religionRef.current && !religionRef.current.contains(e.target as Node)) {
        setReligionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredReligions = React.useMemo(() => {
    if (!religionSearch.trim()) return RELIGIONS;
    const q = religionSearch.toLowerCase();
    return RELIGIONS.filter((r) => r.toLowerCase().includes(q));
  }, [religionSearch]);

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn: () => fetchClasses(schoolId),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          registration_no: initialData.registration_no ?? "",
          class_id: initialData.class_id ?? null,
          date_of_admission: initialData.date_of_admission,
          discount: String(initialData.discount),
          mobile: initialData.mobile ?? "",
          date_of_birth: initialData.date_of_birth ?? "",
          gender: initialData.gender ?? "",
          identification_mark: initialData.identification_mark ?? "",
          blood_group: initialData.blood_group ?? "",
          disease: initialData.disease ?? "",
          birth_form_id: initialData.birth_form_id ?? "",
          additional_note: initialData.additional_note ?? "",
          is_orphan: initialData.is_orphan,
          is_osc: initialData.is_osc,
          is_free: initialData.is_free,
          previous_balance: String(initialData.previous_balance),
          annual_dues_discount: String(initialData.annual_dues_discount ?? 0),
          previous_annual_due: String(initialData.previous_annual_due ?? 0),
          religion: initialData.religion ?? "",
          family: initialData.family ?? "",
          total_siblings: String(initialData.total_siblings),
          address: initialData.address ?? "",
          father_name: initialData.father_name ?? "",
          father_nic: initialData.father_nic ?? "",
          father_profession: initialData.father_profession ?? "",
        }
      : {
          name: "",
          registration_no: "",
          class_id: null,
          date_of_admission: new Date().toISOString().split("T")[0],
          discount: "0",
          mobile: "",
          date_of_birth: "",
          gender: "",
          identification_mark: "",
          blood_group: "",
          disease: "",
          birth_form_id: "",
          additional_note: "",
          is_orphan: false,
          is_osc: false,
          is_free: false,
          previous_balance: "0",
          annual_dues_discount: "0",
          previous_annual_due: "0",
          religion: "Islam",
          family: "",
          total_siblings: "0",
          address: "",
          father_name: "",
          father_nic: "",
          father_profession: "",
        },
  });

  // Find selected class for fee display
  const selectedClass = classes.find((c) => c.id === watch("class_id"));
  const classFee = selectedClass?.fee ?? 0;
  const discountNum = Number(watch("discount") || 0);
  const netFee = Math.max(classFee - discountNum, 0);

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true);
    try {
      const studentId = initialData?.id;
      if (studentId) {
        // Existing student — upload to server immediately
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(
          `/api/students/${schoolId}/${studentId}/photo`,
          { method: "POST", body: fd }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        setPhotoUrl(json.data.photo_url);
        toast({ title: "Photo uploaded", variant: "success" });
      } else {
        // New student — preview locally, will be uploaded after creation
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        toast({ title: "Photo selected", description: "Will be saved with the student record.", variant: "success" });
      }
    } catch (e) {
      toast({
        title: "Photo upload failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function uploadPhotoAfterCreate(studentId: string, file: File): Promise<string | null> {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `/api/students/${schoolId}/${studentId}/photo`,
        { method: "POST", body: fd }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      return json.data.photo_url;
    } catch {
      return null;
    }
  }

  async function handleValidSubmit(v: StudentFormValues) {
    setSubmitting(true);
    try {
      // Process mobile: ensure +92 prefix
      let mobile = v.mobile?.trim() || null;
      if (mobile) {
        // Remove any spaces/dashes
        mobile = mobile.replace(/[\s-]/g, "");
        // If starts with 0, replace with +92
        if (mobile.startsWith("0")) {
          mobile = "+92" + mobile.slice(1);
        }
        // If doesn't start with +, add +92
        else if (!mobile.startsWith("+")) {
          mobile = "+92" + mobile;
        }
      }

      const payload: Record<string, unknown> = {
        name: v.name,
        registration_no: v.registration_no?.trim() || null,
        class_id: v.class_id || null,
        photo_url: photoUrl,
        date_of_admission: v.date_of_admission,
        discount: Number(v.discount) || 0,
        mobile: mobile,
        date_of_birth: v.date_of_birth || null,
        gender: v.gender || null,
        identification_mark: v.identification_mark || null,
        blood_group: v.blood_group || null,
        disease: v.disease || null,
        birth_form_id: v.birth_form_id || null,
        additional_note: v.additional_note || null,
        is_orphan: v.is_orphan ?? false,
        is_osc: v.is_osc ?? false,
        is_free: v.is_free ?? false,
        previous_balance: Number(v.previous_balance) || 0,
        annual_dues_discount: Number(v.annual_dues_discount) || 0,
        previous_annual_due: Number(v.previous_annual_due) || 0,
        religion: v.religion || null,
        family: v.family || null,
        total_siblings: Number(v.total_siblings) || 0,
        address: v.address || null,
        father_name: v.father_name || null,
        father_nic: v.father_nic || null,
        father_profession: v.father_profession || null,
      };
      const result = await onSubmit(payload);

      // If creating new student and a photo was selected, upload it now
      if (!initialData && photoFileRef.current && result.id) {
        const uploadedUrl = await uploadPhotoAfterCreate(result.id, photoFileRef.current);
        if (uploadedUrl) {
          // Update the student with the photo URL
          await onSubmit({ photo_url: uploadedUrl });
        }
      }

      onSuccess?.(result);
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(handleValidSubmit)} className="space-y-5">
      {/* Photo + Name */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-muted/40">
          {(photoUrl || photoPreview) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl || photoPreview || undefined}
              alt="Student photo"
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <Label className="block text-sm">Profile Photo</Label>
            <p className="text-xs text-muted-foreground">
              JPG or PNG. Max 500KB.
            </p>
          </div>
          <label className="inline-block">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  photoFileRef.current = file;
                  handlePhotoUpload(file);
                }
                e.target.value = "";
              }}
            />
            <span className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
              {uploadingPhoto ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploadingPhoto ? "Uploading..." : "Upload Photo"}
            </span>
          </label>
        </div>
      </div>

      {/* Name + Registration No */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="student_name">
            Student Name <span className="text-destructive">*</span>
          </Label>
          <Input id="student_name" placeholder="Full name" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="registration_no">Registration No</Label>
          <Input
            id="registration_no"
            placeholder="Auto-generated (STU-0001)"
            {...register("registration_no")}
          />
          <p className="text-[10px] text-muted-foreground">
            Leave empty to auto-generate. If entered, STU- prefix is added automatically.
          </p>
        </div>
      </div>

      {/* Class + Admission */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Class</Label>
          <Select
            value={watch("class_id") || "__none__"}
            onValueChange={(v) =>
              setValue("class_id", v === "__none__" ? null : v, { shouldDirty: true })
            }
          >
            <SelectTrigger>
              <SelectValue
                placeholder={classesLoading ? "Loading..." : "Select class"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— No class —</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} (Rs. {c.fee.toLocaleString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date_of_admission">
            Date of Admission <span className="text-destructive">*</span>
          </Label>
          <Input
            id="date_of_admission"
            type="date"
            {...register("date_of_admission")}
          />
          {errors.date_of_admission && (
            <p className="text-xs text-destructive">
              {errors.date_of_admission.message}
            </p>
          )}
        </div>
      </div>

      {/* Fee info */}
      {selectedClass && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Net Fee:</span>
          <span className="font-semibold">
            Rs. {netFee.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">
            (Class: {classFee.toLocaleString()} − Discount: {discountNum.toLocaleString()})
          </span>
        </div>
      )}

      {/* Discount + Previous Balance + Free */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="discount">Discount in Fee</Label>
          <Input
            id="discount"
            type="number"
            step="0.01"
            placeholder="0"
            {...register("discount")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="previous_balance">Previous Balance</Label>
          <Input
            id="previous_balance"
            type="number"
            step="0.01"
            placeholder="0"
            {...register("previous_balance")}
          />
        </div>

        <div className="flex items-end pb-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={watch("is_free") ?? false}
              onChange={(e) => setValue("is_free", e.target.checked, { shouldDirty: true })}
            />
            Free Education
          </label>
        </div>
      </div>

      {/* Annual Dues Discount + Previous Annual Due */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="annual_dues_discount">Discount in Annual Dues</Label>
          <Input
            id="annual_dues_discount"
            type="number"
            step="0.01"
            placeholder="0"
            {...register("annual_dues_discount")}
          />
          <p className="text-[10px] text-muted-foreground">
            Discount on the class annual dues amount.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="previous_annual_due">Previous Annual Due</Label>
          <Input
            id="previous_annual_due"
            type="number"
            step="0.01"
            placeholder="0"
            {...register("previous_annual_due")}
          />
          <p className="text-[10px] text-muted-foreground">
            Outstanding annual dues from previous year(s).
          </p>
        </div>
      </div>

      {/* Mobile */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="mobile">Mobile (SMS/WhatsApp)</Label>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm font-medium text-muted-foreground">
              +92
            </span>
            <Input
              id="mobile"
              className="rounded-l-none"
              placeholder="3xx-xxxxxxx"
              {...register("mobile")}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">Enter number without +92 prefix</p>
        </div>
      </div>

      {/* DOB + Gender */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="date_of_birth">Date of Birth</Label>
          <Input id="date_of_birth" type="date" {...register("date_of_birth")} />
        </div>

        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select
            value={watch("gender") || "__none__"}
            onValueChange={(v) =>
              setValue("gender", v === "__none__" ? "" : v, { shouldDirty: true })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— None —</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Blood Group + Identification Mark */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="blood_group">Blood Group</Label>
          <Select
            value={watch("blood_group") || "__none__"}
            onValueChange={(v) =>
              setValue("blood_group", v === "__none__" ? "" : v, { shouldDirty: true })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select blood group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— None —</SelectItem>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="identification_mark">Identification Mark</Label>
          <Input
            id="identification_mark"
            placeholder="e.g. Scar on left arm"
            {...register("identification_mark")}
          />
        </div>
      </div>

      {/* Disease + Birth Form ID */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="disease">Disease (if any)</Label>
          <Input
            id="disease"
            placeholder="e.g. Asthma"
            {...register("disease")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="birth_form_id">Birth Form ID / NIC</Label>
          <Input
            id="birth_form_id"
            placeholder="Student Birth Form ID / NIC"
            {...register("birth_form_id")}
          />
        </div>
      </div>

      {/* Religion + Family */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Religion</Label>
          <div className="relative" ref={religionRef}>
            <button
              type="button"
              onClick={() => {
                setReligionOpen((v) => !v);
                setTimeout(() => religionInputRef.current?.focus(), 0);
              }}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <span className={watch("religion") ? "text-foreground" : "text-muted-foreground"}>
                {watch("religion") || "Select religion"}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
            {religionOpen && (
              <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                <div className="flex items-center border-b px-2">
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    ref={religionInputRef}
                    value={religionSearch}
                    onChange={(e) => setReligionSearch(e.target.value)}
                    placeholder="Search religion..."
                    className="h-8 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const first = filteredReligions[0];
                        if (first) {
                          setValue("religion", first, { shouldDirty: true });
                          setReligionOpen(false);
                          setReligionSearch("");
                        }
                      }
                      if (e.key === "Escape") {
                        setReligionOpen(false);
                      }
                    }}
                  />
                  {religionSearch && (
                    <button
                      type="button"
                      onClick={() => setReligionSearch("")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredReligions.length === 0 ? (
                    <p className="py-3 text-center text-xs text-muted-foreground">
                      No religion found
                    </p>
                  ) : (
                    filteredReligions.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setValue("religion", r, { shouldDirty: true });
                          setReligionOpen(false);
                          setReligionSearch("");
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/60"
                      >
                        {r}
                        {watch("religion") === r && (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="family">Family</Label>
          <Input id="family" placeholder="Family name" {...register("family")} />
        </div>
      </div>

      {/* Total Siblings + Orphan + OSC */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="total_siblings">Total Siblings</Label>
          <Input
            id="total_siblings"
            type="number"
            placeholder="0"
            {...register("total_siblings")}
          />
        </div>

        <div className="flex items-end pb-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={watch("is_orphan") ?? false}
              onChange={(e) => setValue("is_orphan", e.target.checked, { shouldDirty: true })}
            />
            Orphan Student
          </label>
        </div>

        <div className="flex items-end pb-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={watch("is_osc") ?? false}
              onChange={(e) => setValue("is_osc", e.target.checked, { shouldDirty: true })}
            />
            OSC
          </label>
        </div>
      </div>

      {/* Father Info */}
      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Father / Guardian
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="father_name">Father Name</Label>
            <Input id="father_name" placeholder="Father's name" {...register("father_name")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="father_nic">Father National ID</Label>
            <Input id="father_nic" placeholder="CNIC" {...register("father_nic")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="father_profession">Profession</Label>
            <Input id="father_profession" placeholder="e.g. Business" {...register("father_profession")} />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" rows={2} placeholder="Home address" {...register("address")} />
      </div>

      {/* Additional Note */}
      <div className="space-y-1.5">
        <Label htmlFor="additional_note">Additional Note</Label>
        <Textarea id="additional_note" rows={2} placeholder="Any extra information" {...register("additional_note")} />
      </div>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
