import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorize("student");
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const supabase = await createClient();
    const user = authResult.user;

    const { searchParams } = new URL(request.url);
    const courseId =
      searchParams.get("courseId") || searchParams.get("courseSlug");

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID or slug is required" },
        { status: 400 }
      );
    }

    // Get course details (handle both slug and public_id)
    let course = null;
    let courseError = null;

    // First try to find by slug
    const { data: courseBySlug, error: slugError } = await supabase
      .from("course")
      .select("*")
      .eq("slug", courseId)
      .eq("is_deleted", false)
      .single();

    if (courseBySlug) {
      course = courseBySlug;
    } else {
      // If not found by slug, try by public_id (only if it looks like a UUID)
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          courseId
        );
      if (isUUID) {
        const { data: courseByPublicId, error: publicIdError } = await supabase
          .from("course")
          .select("*")
          .eq("public_id", courseId)
          .eq("is_deleted", false)
          .single();

        course = courseByPublicId;
        courseError = publicIdError;
      } else {
        courseError = slugError;
      }
    }

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check if user is enrolled in the course or if it's a free course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("course_enrollment")
      .select("id")
      .eq("course_id", course.id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid error when no enrollment exists

    // Debug log
    console.log("Enrollment check:", {
      courseId: course.id,
      userId: user.id,
      enrollment,
      enrollmentError,
      isFree: course.is_free,
      priceCents: course.price_cents,
    });

    // If not enrolled and course is paid, check enrollment
    if (!enrollment && !course.is_free && course.price_cents > 0) {
      return NextResponse.json(
        { error: "Not enrolled in this course" },
        { status: 403 }
      );
    }

    // For free courses, auto-enroll if not already enrolled
    if (!enrollment && (course.is_free || course.price_cents === 0)) {
      const { error: insertError } = await supabase
        .from("course_enrollment")
        .insert({
          user_id: user.id,
          course_id: course.id,
          status: "active",
          started_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Auto-enrollment error:", insertError);
      }
    }

    // Get concepts for this course
    const { data: conceptsData, error: conceptsError } = await supabase
      .from("course_concept")
      .select("*")
      .eq("course_id", course.id)
      .eq("is_deleted", false)
      .order("difficulty_level", { ascending: true });

    if (conceptsError) {
      return NextResponse.json(
        { error: "Failed to fetch concepts" },
        { status: 500 }
      );
    }

    const conceptIds = conceptsData?.map((c: any) => c.id) || [];

    // Get concept links - only if we have concepts
    let linksData: any[] = [];
    let linksError = null;

    if (conceptIds.length > 0) {
      const result = await supabase
        .from("course_concept_link")
        .select(
          `
          *,
          source_concept:course_concept!source_concept_id(public_id, name),
          target_concept:course_concept!target_concept_id(public_id, name)
        `
        )
        .or(
          `source_concept_id.in.(${conceptIds.join(
            ","
          )}),target_concept_id.in.(${conceptIds.join(",")})`
        )
        .eq("is_deleted", false);

      linksData = result.data || [];
      linksError = result.error;
    }

    if (linksError) {
      return NextResponse.json(
        { error: "Failed to fetch concept links" },
        { status: 500 }
      );
    }

    // Get concept-lesson mappings - only if we have concepts
    let conceptLessonsData: any[] = [];
    let conceptLessonsError = null;

    if (conceptIds.length > 0) {
      const result = await supabase
        .from("course_concept_lesson")
        .select(
          `
          *,
          concept:course_concept!inner(public_id, name),
          lesson:course_lesson!inner(public_id, title, position)
        `
        )
        .in("concept_id", conceptIds)
        .eq("is_deleted", false);

      conceptLessonsData = result.data || [];
      conceptLessonsError = result.error;
    }

    if (conceptLessonsError) {
      return NextResponse.json(
        { error: "Failed to fetch concept lessons" },
        { status: 500 }
      );
    }

    // Format concepts with their lessons
    const conceptsWithLessons =
      conceptsData?.map((concept: any) => {
        const relatedLessons =
          conceptLessonsData
            ?.filter((cl: any) => cl.concept_id === concept.id)
            .map((cl: any) => ({
              id: cl.lesson.public_id,
              title: cl.lesson.title,
              position: cl.lesson.position,
              relevanceScore: cl.relevance_score,
            }))
            .sort((a: any, b: any) => a.position - b.position) || [];

        return {
          id: concept.public_id,
          name: concept.name,
          description: concept.description,
          difficultyLevel: concept.difficulty_level,
          estimatedTimeMinutes: concept.estimated_time_minutes,
          lessons: relatedLessons,
        };
      }) || [];

    // Format links for graph visualization
    const links = linksData?.map((link: any) => ({
      id: link.public_id,
      source: link.source_concept.public_id,
      target: link.target_concept.public_id,
      relationType: link.relation_type,
      strength: link.strength,
      sourceLabel: link.source_concept.name,
      targetLabel: link.target_concept.name,
    }));

    return NextResponse.json({
      success: true,
      course: {
        id: course.public_id,
        title: course.title,
      },
      concepts: conceptsWithLessons,
      links: links,
    });
  } catch (error) {
    console.error("Concept fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize("student");
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const supabase = await createClient();
    const user = authResult.user;

    const {
      courseId,
      name,
      description,
      difficultyLevel,
      estimatedTimeMinutes,
      lessonIds,
    } = await request.json();

    if (!courseId || !name) {
      return NextResponse.json(
        { error: "Course ID/slug and name are required" },
        { status: 400 }
      );
    }

    // Get course details and check ownership (handle both slug and public_id)
    let course = null;
    let courseError = null;

    // First try to find by slug
    const { data: courseBySlug, error: slugError } = await supabase
      .from("course")
      .select("*")
      .eq("slug", courseId)
      .eq("owner_id", user.id)
      .eq("is_deleted", false)
      .single();

    if (courseBySlug) {
      course = courseBySlug;
    } else {
      // If not found by slug, try by public_id (only if it looks like a UUID)
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          courseId
        );
      if (isUUID) {
        const { data: courseByPublicId, error: publicIdError } = await supabase
          .from("course")
          .select("*")
          .eq("public_id", courseId)
          .eq("owner_id", user.id)
          .eq("is_deleted", false)
          .single();

        course = courseByPublicId;
        courseError = publicIdError;
      } else {
        courseError = slugError;
      }
    }

    if (courseError || !course) {
      return NextResponse.json(
        { error: "Course not found or insufficient permissions" },
        { status: 404 }
      );
    }

    // Create concept
    const { data: concept, error: conceptError } = await supabase
      .from("course_concept")
      .insert({
        course_id: course.id,
        name,
        description,
        difficulty_level: difficultyLevel || 1,
        estimated_time_minutes: estimatedTimeMinutes || 30,
      })
      .select()
      .single();

    if (conceptError) {
      return NextResponse.json(
        { error: "Failed to create concept" },
        { status: 500 }
      );
    }

    // Link to lessons if provided
    if (lessonIds && lessonIds.length > 0) {
      const { data: lessons } = await supabase
        .from("course_lesson")
        .select("id, public_id")
        .eq("course_id", course.id)
        .in("public_id", lessonIds);

      if (lessons && lessons.length > 0) {
        const conceptLessons = lessons.map((lesson: any) => ({
          concept_id: concept.id,
          lesson_id: lesson.id,
          relevance_score: 1.0,
        }));

        await supabase.from("course_concept_lesson").insert(conceptLessons);
      }
    }

    return NextResponse.json({
      success: true,
      concept: {
        id: concept.public_id,
        name: concept.name,
        description: concept.description,
        difficultyLevel: concept.difficulty_level,
        estimatedTimeMinutes: concept.estimated_time_minutes,
      },
    });
  } catch (error) {
    console.error("Concept creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
