import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET - Fetch quiz with submissions and check student status
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    try {
        const supabase = await createClient();
        const { slug, id: quizId } = await params;
        const { searchParams } = new URL(request.url);
        const checkStatus = searchParams.get('checkStatus') === 'true';

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Get classroom
        const { data: classroom } = await supabase
            .from('classroom')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

        if (!classroom) {
            return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
        }

        // If checking status (for student accessing quiz)
        if (checkStatus) {
            // Check if already submitted
            const { data: existingSubmission } = await supabase
                .from('classroom_submission')
                .select('id, submitted_at, score, max_score')
                .eq('submittable_type', 'quiz')
                .eq('submittable_id', quizId)
                .eq('student_id', profile.id)
                .eq('is_deleted', false)
                .maybeSingle();

            if (existingSubmission) {
                return NextResponse.json({
                    canTakeQuiz: false,
                    reason: 'already_submitted',
                    submission: existingSubmission
                });
            }

            // Check for active session
            const { data: activeSession } = await supabase
                .from('classroom_quiz_session')
                .select('*')
                .eq('quiz_id', quizId)
                .eq('student_id', profile.id)
                .eq('is_active', true)
                .maybeSingle();

            if (activeSession) {
                const now = new Date();
                const expiresAt = new Date(activeSession.expires_at);

                if (now > expiresAt) {
                    // Session expired
                    return NextResponse.json({
                        canTakeQuiz: false,
                        reason: 'session_expired',
                        session: activeSession
                    });
                }

                // Active session exists
                return NextResponse.json({
                    canTakeQuiz: true,
                    hasActiveSession: true,
                    session: activeSession,
                    timeRemaining: Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
                });
            }

            // Can start new quiz
            return NextResponse.json({
                canTakeQuiz: true,
                hasActiveSession: false
            });
        }

        // Get quiz submissions with student info (for teachers)
        const { data: submissions, error: submissionsError } = await supabase
            .from('classroom_submission')
            .select(`
        *,
        student:profiles!classroom_submission_student_id_fkey (
          id,
          display_name,
          full_name,
          avatar_url
        )
      `)
            .eq('submittable_type', 'quiz')
            .eq('submittable_id', quizId)
            .eq('is_deleted', false)
            .order('submitted_at', { ascending: false });

        if (submissionsError) {
            console.error('Error fetching submissions:', submissionsError);
            return NextResponse.json(
                { error: 'Failed to fetch submissions' },
                { status: 500 }
            );
        }

        return NextResponse.json({ submissions });
    } catch (error: any) {
        console.error('Error in GET /api/classroom/[slug]/quizzes/[id]:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST - Start quiz session OR Submit quiz
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    try {
        const supabase = await createClient();
        const { slug, id: quizId } = await params;
        const body = await request.json();
        const action = body.action; // 'start' or 'submit'

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Get classroom
        const { data: classroom } = await supabase
            .from('classroom')
            .select('id')
            .eq('slug', slug)
            .single();

        if (!classroom) {
            return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
        }

        // Get quiz
        const { data: quiz } = await supabase
            .from('classroom_quiz')
            .select('id, title, settings')
            .eq('id', quizId)
            .eq('classroom_id', classroom.id)
            .eq('is_deleted', false)
            .single();

        if (!quiz) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        // Check if submission already exists
        const { data: existingSubmission } = await supabase
            .from('classroom_submission')
            .select('id')
            .eq('submittable_type', 'quiz')
            .eq('submittable_id', quizId)
            .eq('student_id', profile.id)
            .eq('is_deleted', false)
            .maybeSingle();

        if (existingSubmission) {
            return NextResponse.json(
                { error: 'You have already submitted this quiz' },
                { status: 400 }
            );
        }

        // Handle START action
        if (action === 'start') {
            // Check for existing active session
            const { data: existingSession } = await supabase
                .from('classroom_quiz_session')
                .select('*')
                .eq('quiz_id', quizId)
                .eq('student_id', profile.id)
                .eq('is_active', true)
                .maybeSingle();

            if (existingSession) {
                const now = new Date();
                const expiresAt = new Date(existingSession.expires_at);

                if (now > expiresAt) {
                    // Deactivate expired session
                    await supabase
                        .from('classroom_quiz_session')
                        .update({ is_active: false })
                        .eq('id', existingSession.id);
                } else {
                    // Return existing active session
                    return NextResponse.json({
                        session: existingSession,
                        timeRemaining: Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
                    });
                }
            }

            // Create new session
            const now = new Date();
            const settings = quiz.settings || {};
            const timeLimit = settings.time_limit || 60; // Default 60 minutes
            const expiresAt = new Date(now.getTime() + timeLimit * 60 * 1000);

            const { data: session, error: sessionError } = await supabase
                .from('classroom_quiz_session')
                .insert({
                    quiz_id: parseInt(quizId),
                    student_id: profile.id,
                    started_at: now.toISOString(),
                    expires_at: expiresAt.toISOString(),
                    is_active: true
                })
                .select()
                .single();

            if (sessionError) {
                console.error('Error creating quiz session:', sessionError);
                return NextResponse.json(
                    { error: 'Failed to start quiz session' },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                session,
                timeRemaining: timeLimit * 60
            }, { status: 201 });
        }

        // Handle SUBMIT action (default)
        // Check for active session
        const { data: activeSession } = await supabase
            .from('classroom_quiz_session')
            .select('*')
            .eq('quiz_id', quizId)
            .eq('student_id', profile.id)
            .eq('is_active', true)
            .maybeSingle();

        if (!activeSession) {
            return NextResponse.json(
                { error: 'No active quiz session found. Please start the quiz first.' },
                { status: 400 }
            );
        }

        // Check if session expired
        const now = new Date();
        const expiresAt = new Date(activeSession.expires_at);

        if (now > expiresAt) {
            // Deactivate expired session
            await supabase
                .from('classroom_quiz_session')
                .update({ is_active: false })
                .eq('id', activeSession.id);

            return NextResponse.json(
                { error: 'Quiz session has expired' },
                { status: 400 }
            );
        }

        // Calculate actual time taken from session
        const startedAt = new Date(activeSession.started_at);
        const actualTimeTaken = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

        // Create submission
        const { data: submission, error: submissionError } = await supabase
            .from('classroom_submission')
            .insert({
                submittable_type: 'quiz',
                submittable_id: parseInt(quizId),
                student_id: profile.id,
                answers: body.answers || {},
                score: body.score || 0,
                max_score: body.max_score || 0,
                time_taken_seconds: actualTimeTaken,
                submitted_at: now.toISOString(),
            })
            .select()
            .single();

        if (submissionError) {
            console.error('Error creating submission:', submissionError);
            return NextResponse.json(
                { error: 'Failed to submit quiz' },
                { status: 500 }
            );
        }

        // Deactivate session and mark as submitted
        await supabase
            .from('classroom_quiz_session')
            .update({
                is_active: false,
                submitted_at: now.toISOString()
            })
            .eq('id', activeSession.id);

        return NextResponse.json({ submission }, { status: 201 });
    } catch (error: any) {
        console.error('Error in POST /api/classroom/[slug]/quizzes/[id]:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT - Update quiz
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    try {
        const supabase = await createClient();
        const { slug, id } = await params;
        const body = await request.json();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get classroom
        const { data: classroom, error: classroomError } = await supabase
            .from('classroom')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

        if (classroomError || !classroom) {
            return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
        }

        // If questions are provided, handle them separately
        if (body.questions && Array.isArray(body.questions)) {
            // First, delete existing quiz questions
            await supabase
                .from('classroom_quiz_question')
                .delete()
                .eq('quiz_id', id);

            // Create new questions and link them to the quiz
            for (const question of body.questions) {
                // Map question types to database format
                const kindMap: Record<string, string> = {
                    'multiple_choice': 'mcq',
                    'true_false': 'true_false',
                    'short_answer': 'short'
                };

                const dbKind = kindMap[question.question_type] || question.question_type;

                // Create the question in classroom_question table
                const { data: createdQuestion, error: questionError } = await supabase
                    .from('classroom_question')
                    .insert({
                        stem: question.question_text,
                        kind: dbKind,
                        choices: question.options || null,
                        answer: question.correct_answer || null,
                    })
                    .select()
                    .single();

                if (questionError) {
                    console.error('Error creating question:', questionError);
                    continue;
                }

                // Link the question to the quiz
                await supabase
                    .from('classroom_quiz_question')
                    .insert({
                        quiz_id: parseInt(id),
                        question_id: createdQuestion.id,
                        points: question.points || 1,
                        position: question.order_index || 0,
                    });
            }
        }

        // Update quiz settings if provided
        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        if (body.title) {
            updateData.title = body.title;
        }

        if (body.settings || body.time_limit !== undefined || body.allow_multiple_attempts !== undefined || body.due_date !== undefined) {
            updateData.settings = body.settings || {
                shuffle: true,
                time_limit: body.time_limit || null,
                allow_multiple_attempts: body.allow_multiple_attempts || false,
                due_date: body.due_date || null
            };
        }

        const { data: quiz, error: quizError } = await supabase
            .from('classroom_quiz')
            .update(updateData)
            .eq('id', id)
            .eq('classroom_id', classroom.id)
            .select()
            .single();

        if (quizError) {
            console.error('Error updating quiz:', quizError);
            return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
        }

        return NextResponse.json({ quiz });
    } catch (error: any) {
        console.error('Error in PUT /api/classroom/[slug]/quizzes/[id]:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    try {
        const supabase = await createClient();
        const { slug, id } = await params;

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get classroom
        const { data: classroom, error: classroomError } = await supabase
            .from('classroom')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

        if (classroomError || !classroom) {
            return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
        }

        // Soft delete quiz
        const { error: deleteError } = await supabase
            .from('classroom_quiz')
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('classroom_id', classroom.id);

        if (deleteError) {
            console.error('Error deleting quiz:', deleteError);
            return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in DELETE /api/classroom/[slug]/quizzes/[id]:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
