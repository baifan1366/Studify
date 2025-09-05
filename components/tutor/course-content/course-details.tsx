'use client';

import CreateCourseModule from '@/components/tutor/course-content/create-course-module';
import CreateCourseLesson from '@/components/tutor/course-content/create-course-lesson';

export default function CourseDetails() {
    return(
        <div>
        <CreateCourseModule />
        <CreateCourseLesson />
        </div>
    )
}