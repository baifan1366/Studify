"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  BookOpen,
  Brain,
  Calendar,
  FileText,
  Filter,
  Plus,
  Search,
  Tag,
  TrendingUp,
  X,
  Trash2,
  Lightbulb,
  Target,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import {
  useMistakeBook,
  useSaveMistake,
  useDeleteMistake,
} from "@/hooks/dashboard/use-mistake-book";
import { useToast } from "@/hooks/use-toast";

export default function MistakeBookPageContent() {
  const t = useTranslations("MistakeBookPage");

  const GUIDE_STEPS = [
    {
      id: "welcome",
      title: t("guide_welcome_title"),
      description: t("guide_welcome_desc"),
      icon: BookOpen,
    },
    {
      id: "create",
      title: t("guide_create_title"),
      description: t("guide_create_desc"),
      icon: Plus,
      target: "create-button",
    },
    {
      id: "filter",
      title: t("guide_filter_title"),
      description: t("guide_filter_desc"),
      icon: Filter,
      target: "filter-section",
    },
    {
      id: "statistics",
      title: t("guide_statistics_title"),
      description: t("guide_statistics_desc"),
      icon: TrendingUp,
      target: "statistics",
    },
    {
      id: "complete",
      title: t("guide_complete_title"),
      description: t("guide_complete_desc"),
      icon: CheckCircle2,
    },
  ];
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSourceType, setSelectedSourceType] = useState<string>("all");
  const [selectedKnowledgePoint, setSelectedKnowledgePoint] =
    useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [knowledgePointInput, setKnowledgePointInput] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [currentGuideStep, setCurrentGuideStep] = useState(0);

  // Fetch mistakes data
  const { data: mistakes = [], isLoading } = useMistakeBook({ limit: 100 });
  const saveMistake = useSaveMistake();
  const deleteMistake = useDeleteMistake();

  // Check if user is first time visitor
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem("mistakeBookGuideCompleted");
    if (!hasSeenGuide && mistakes.length === 0) {
      setShowGuide(true);
    }
  }, [mistakes.length]);

  const handleGuideComplete = () => {
    localStorage.setItem("mistakeBookGuideCompleted", "true");
    setShowGuide(false);
    setCurrentGuideStep(0);
  };

  const handleGuideNext = () => {
    if (currentGuideStep < GUIDE_STEPS.length - 1) {
      setCurrentGuideStep(currentGuideStep + 1);
    } else {
      handleGuideComplete();
    }
  };

  const handleGuideSkip = () => {
    handleGuideComplete();
  };

  // Create mistake form state
  const [newMistake, setNewMistake] = useState({
    mistakeContent: "",
    analysis: "",
    sourceType: "manual" as "quiz" | "assignment" | "manual",
    knowledgePoints: [] as string[],
  });

  const filteredMistakes = mistakes.filter((mistake: any) => {
    const matchesSearch =
      mistake.mistake_content
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      mistake.analysis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mistake.knowledge_points?.some((point: string) =>
        point.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesSourceType =
      selectedSourceType === "all" ||
      mistake.source_type === selectedSourceType;

    const matchesKnowledgePoint =
      selectedKnowledgePoint === "all" ||
      mistake.knowledge_points?.includes(selectedKnowledgePoint);

    return matchesSearch && matchesSourceType && matchesKnowledgePoint;
  });

  const allKnowledgePoints = Array.from(
    new Set(mistakes.flatMap((mistake: any) => mistake.knowledge_points || []))
  );

  const handleCreateMistake = async () => {
    if (!newMistake.mistakeContent.trim()) {
      return;
    }

    try {
      await saveMistake.mutateAsync({
        mistakeContent: newMistake.mistakeContent,
        analysis: newMistake.analysis,
        knowledgePoints: newMistake.knowledgePoints,
        sourceType: newMistake.sourceType,
      });

      toast({
        title: t("save_success"),
        description: t("save_success_desc"),
      });

      setIsCreateDialogOpen(false);
      setNewMistake({
        mistakeContent: "",
        analysis: "",
        sourceType: "manual",
        knowledgePoints: [],
      });
    } catch (error) {
      toast({
        title: t("save_error"),
        description: t("save_error_desc"),
        variant: "destructive",
      });
    }
  };

  const addKnowledgePoint = () => {
    const point = knowledgePointInput.trim();
    if (point && !newMistake.knowledgePoints.includes(point)) {
      setNewMistake((prev) => ({
        ...prev,
        knowledgePoints: [...prev.knowledgePoints, point],
      }));
      setKnowledgePointInput("");
    }
  };

  const removeKnowledgePoint = (point: string) => {
    setNewMistake((prev) => ({
      ...prev,
      knowledgePoints: prev.knowledgePoints.filter((p) => p !== point),
    }));
  };

  const handleDelete = async (mistakeId: string) => {
    if (confirm(t("confirm_delete"))) {
      try {
        await deleteMistake.mutateAsync(mistakeId);
        toast({
          title: t("delete_success"),
          description: t("delete_success_desc"),
        });
      } catch (error) {
        toast({
          title: t("delete_error"),
          description: t("delete_error_desc"),
          variant: "destructive",
        });
      }
    }
  };

  const getSourceTypeIcon = (sourceType: string) => {
    switch (sourceType) {
      case "quiz":
        return <Brain className="h-4 w-4" />;
      case "assignment":
        return <FileText className="h-4 w-4" />;
      case "manual":
        return <BookOpen className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getSourceTypeColor = (sourceType: string) => {
    switch (sourceType) {
      case "quiz":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "assignment":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "manual":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      default:
        return "bg-white/10 text-white/70 border-white/20";
    }
  };

  const getSourceTypeLabel = (sourceType: string) => {
    switch (sourceType) {
      case "quiz":
        return t("quiz");
      case "assignment":
        return t("assignment");
      case "manual":
        return t("manual");
      default:
        return sourceType;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="w-full h-32" />
          <Skeleton className="w-full h-64" />
          <Skeleton className="w-full h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl border border-red-500/30">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              {t("mistake_book")}
            </h1>
            <p className="text-white/70 text-lg">{t("track_mistakes")}</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(true)}
              className="border-white/20 hover:bg-white/10"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              {t("user_guide")}
            </Button>

            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  id="create-button"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("create_mistake")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-gray-900/95 border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white text-xl">
                  {t("create_mistake")}
                </DialogTitle>
                <DialogDescription className="text-white/60">
                  {t("track_mistakes")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="source-type" className="text-white">
                    {t("source_type")}
                  </Label>
                  <Select
                    value={newMistake.sourceType}
                    onValueChange={(value: "quiz" | "assignment" | "manual") =>
                      setNewMistake((prev) => ({ ...prev, sourceType: value }))
                    }
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      <SelectItem value="manual">{t("manual")}</SelectItem>
                      <SelectItem value="quiz">{t("quiz")}</SelectItem>
                      <SelectItem value="assignment">
                        {t("assignment")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="mistake-content" className="text-white">
                    {t("mistake_content")}
                  </Label>
                  <Textarea
                    id="mistake-content"
                    placeholder={t("mistake_content")}
                    value={newMistake.mistakeContent}
                    onChange={(e) =>
                      setNewMistake((prev) => ({
                        ...prev,
                        mistakeContent: e.target.value,
                      }))
                    }
                    rows={4}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>

                <div>
                  <Label htmlFor="analysis" className="text-white">
                    {t("analysis")}
                  </Label>
                  <Textarea
                    id="analysis"
                    placeholder={t("error_analysis_placeholder")}
                    value={newMistake.analysis}
                    onChange={(e) =>
                      setNewMistake((prev) => ({
                        ...prev,
                        analysis: e.target.value,
                      }))
                    }
                    rows={3}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>

                <div>
                  <Label className="text-white">{t("knowledge_points")}</Label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-3">
                    {newMistake.knowledgePoints.map((point, index) => (
                      <Badge
                        key={index}
                        className="bg-purple-500/20 text-purple-300 border-purple-500/30 flex items-center gap-1"
                      >
                        {point}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-purple-100"
                          onClick={() => removeKnowledgePoint(point)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("add_knowledge_point_placeholder")}
                      value={knowledgePointInput}
                      onChange={(e) => setKnowledgePointInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addKnowledgePoint();
                        }
                      }}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addKnowledgePoint}
                      className="border-white/10 hover:bg-white/5"
                    >
                      {t("add")}
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="border-white/10 hover:bg-white/5"
                >
                  {t("cancel")}
                </Button>
                <Button
                  onClick={handleCreateMistake}
                  disabled={
                    !newMistake.mistakeContent.trim() || saveMistake.isPending
                  }
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {saveMistake.isPending
                    ? t("create") + "..."
                    : t("save_mistake")}
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Statistics */}
        <motion.div
          id="statistics"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <Card className="bg-gradient-to-br from-red-600/20 to-orange-600/20 border-red-500/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/70">
                    {t("total_mistakes")}
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {mistakes.length}
                  </p>
                </div>
                <AlertCircle className="h-12 w-12 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/70">
                    {t("quiz_mistakes")}
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {
                      mistakes.filter((m: any) => m.source_type === "quiz")
                        .length
                    }
                  </p>
                </div>
                <Brain className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/70">
                    {t("assignment_mistakes")}
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {
                      mistakes.filter(
                        (m: any) => m.source_type === "assignment"
                      ).length
                    }
                  </p>
                </div>
                <FileText className="h-12 w-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/70">
                    {t("knowledge_point_count")}
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {allKnowledgePoints.length}
                  </p>
                </div>
                <Tag className="h-12 w-12 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          id="filter-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 h-4 w-4" />
                  <Input
                    placeholder={t("search_content_analysis_knowledge")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>

                <Select
                  value={selectedSourceType}
                  onValueChange={setSelectedSourceType}
                >
                  <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10 text-white">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10">
                    <SelectItem value="all">{t("all_types")}</SelectItem>
                    <SelectItem value="quiz">{t("quiz")}</SelectItem>
                    <SelectItem value="assignment">
                      {t("assignment")}
                    </SelectItem>
                    <SelectItem value="manual">{t("manual")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedKnowledgePoint}
                  onValueChange={setSelectedKnowledgePoint}
                >
                  <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10 text-white">
                    <Tag className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10">
                    <SelectItem value="all">
                      {t("all_knowledge_points")}
                    </SelectItem>
                    {allKnowledgePoints.map((point: string) => (
                      <SelectItem key={point} value={point}>
                        {point}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mistake List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredMistakes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <BookOpen className="h-16 w-16 text-white/30 mx-auto mb-4" />
                      <h3 className="text-xl font-medium text-white mb-2">
                        {t("no_mistake_records")}
                      </h3>
                      <p className="text-white/60 mb-6">
                        {t("start_recording_mistakes")}
                      </p>
                      <Button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("add_first_mistake")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              filteredMistakes.map((mistake: any, index: number) => (
                <motion.div
                  key={mistake.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 group">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-4">
                          {/* Header with badges */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge
                              className={`flex items-center gap-1.5 ${getSourceTypeColor(
                                mistake.source_type
                              )}`}
                            >
                              {getSourceTypeIcon(mistake.source_type)}
                              {getSourceTypeLabel(mistake.source_type)}
                            </Badge>

                            <div className="flex items-center text-sm text-white/50">
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              {new Date(
                                mistake.created_at
                              ).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Mistake Content */}
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <Target className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <h4 className="font-medium text-white/90 mb-1">
                                  {t("mistake_content_label")}
                                </h4>
                                <p className="text-white/70 leading-relaxed">
                                  {mistake.mistake_content}
                                </p>
                              </div>
                            </div>

                            {/* Knowledge Points */}
                            {mistake.knowledge_points &&
                              mistake.knowledge_points.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {mistake.knowledge_points.map(
                                    (point: string, idx: number) => (
                                      <Badge
                                        key={idx}
                                        variant="outline"
                                        className="bg-purple-500/10 text-purple-300 border-purple-500/30"
                                      >
                                        <Tag className="h-3 w-3 mr-1" />
                                        {point}
                                      </Badge>
                                    )
                                  )}
                                </div>
                              )}

                            {/* Recommended Exercises */}
                            {mistake.recommended_exercises && (
                              <div className="flex items-center gap-2 text-sm text-white/60">
                                <TrendingUp className="h-4 w-4 text-blue-400" />
                                <span>
                                  {t("from")}:{" "}
                                  {mistake.recommended_exercises.difficulty}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(mistake.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* User Guide Dialog */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/30 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white flex items-center gap-3">
              {React.createElement(GUIDE_STEPS[currentGuideStep].icon, {
                className: "h-7 w-7 text-purple-400",
              })}
              {GUIDE_STEPS[currentGuideStep].title}
            </DialogTitle>
            <DialogDescription className="text-white/70 text-base pt-2">
              {GUIDE_STEPS[currentGuideStep].description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {/* Progress Indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {GUIDE_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentGuideStep
                      ? "w-8 bg-purple-500"
                      : index < currentGuideStep
                        ? "w-2 bg-purple-500/50"
                        : "w-2 bg-white/20"
                  }`}
                />
              ))}
            </div>

            {/* Step Content */}
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              {currentGuideStep === 0 && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-red-400 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-white mb-1">{t("guide_record_mistakes")}</h4>
                      <p className="text-white/70 text-sm">
                        {t("guide_record_mistakes_desc")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-yellow-400 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-white mb-1">{t("guide_analyze_reasons")}</h4>
                      <p className="text-white/70 text-sm">
                        {t("guide_analyze_reasons_desc")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-white mb-1">{t("guide_continuous_improvement")}</h4>
                      <p className="text-white/70 text-sm">
                        {t("guide_continuous_improvement_desc")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentGuideStep === 1 && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4 border border-blue-500/30">
                    <h4 className="font-medium text-white mb-2">
                      {t("guide_create_ways_title")}
                    </h4>
                    <ul className="space-y-2 text-white/70 text-sm">
                      <li className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-blue-400" />
                        <span>{t("guide_create_from_quiz")}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-400" />
                        <span>{t("guide_create_from_assignment")}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-purple-400" />
                        <span>{t("guide_create_manual")}</span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-white/60 text-sm">
                    {t("guide_create_tip")}
                  </p>
                </div>
              )}

              {currentGuideStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <Search className="h-5 w-5 text-blue-400 mb-2" />
                      <h4 className="font-medium text-white mb-1">{t("guide_search_feature")}</h4>
                      <p className="text-white/60 text-sm">
                        {t("guide_search_feature_desc")}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <Filter className="h-5 w-5 text-purple-400 mb-2" />
                      <h4 className="font-medium text-white mb-1">{t("guide_filter_feature")}</h4>
                      <p className="text-white/60 text-sm">
                        {t("guide_filter_feature_desc")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentGuideStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg p-4 border border-red-500/30">
                      <AlertCircle className="h-6 w-6 text-red-400 mb-2" />
                      <p className="text-sm text-white/70">错题总数</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg p-4 border border-blue-500/30">
                      <Brain className="h-6 w-6 text-blue-400 mb-2" />
                      <p className="text-sm text-white/70">测验错题</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg p-4 border border-green-500/30">
                      <FileText className="h-6 w-6 text-green-400 mb-2" />
                      <p className="text-sm text-white/70">作业错题</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg p-4 border border-purple-500/30">
                      <Tag className="h-6 w-6 text-purple-400 mb-2" />
                      <p className="text-sm text-white/70">知识点数</p>
                    </div>
                  </div>
                </div>
              )}

              {currentGuideStep === 4 && (
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    {t("guide_ready_title")}
                  </h3>
                  <p className="text-white/70 mb-4">
                    {t("guide_ready_desc")}
                  </p>
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4 border border-blue-500/30">
                    <p className="text-white/80 text-sm">
                      {t("guide_tip")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleGuideSkip}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              {t("guide_skip")}
            </Button>
            <div className="flex items-center gap-2">
              {currentGuideStep > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentGuideStep(currentGuideStep - 1)}
                  className="border-white/20 hover:bg-white/10"
                >
                  {t("guide_previous")}
                </Button>
              )}
              <Button
                onClick={handleGuideNext}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {currentGuideStep === GUIDE_STEPS.length - 1 ? (
                  t("guide_start_using")
                ) : (
                  <>
                    {t("guide_next")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
