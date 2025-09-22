/**
 * Course status utility functions
 * Handles business logic for course status restrictions
 */

export type CourseStatus = 'active' | 'pending' | 'inactive' | 'ban' | 'rejected';

/**
 * Check if course operations (edit/delete) are allowed based on status
 * Only courses with 'inactive' status can be edited or deleted by tutors
 */
export function canEditCourse(status: CourseStatus): boolean {
  return status === 'inactive';
}

/**
 * Check if modules can be created/edited/deleted based on course status
 * Only courses with 'inactive' status can have modules modified
 */
export function canEditModules(courseStatus: CourseStatus): boolean {
  return courseStatus === 'inactive';
}

/**
 * Check if lessons can be created/edited/deleted based on course status
 * Only courses with 'inactive' status can have lessons modified
 */
export function canEditLessons(courseStatus: CourseStatus): boolean {
  return courseStatus === 'inactive';
}

/**
 * Check if course status can be changed from current to target status
 * Tutors can only:
 * - Submit inactive courses for approval (inactive → pending)
 * - Change active courses back to inactive (active → inactive)
 * - Acknowledge rejected courses (rejected → inactive)
 * Banned courses cannot be modified by tutors
 */
export function canChangeStatus(currentStatus: CourseStatus, targetStatus: CourseStatus): boolean {
  // Banned courses cannot be modified by tutors
  if (currentStatus === 'ban') {
    return false;
  }
  
  // Submit for approval: inactive → pending
  if (currentStatus === 'inactive' && targetStatus === 'pending') {
    return true;
  }
  
  // Deactivate course: active → inactive
  if (currentStatus === 'active' && targetStatus === 'inactive') {
    return true;
  }
  
  // Acknowledge rejection: rejected → inactive
  if (currentStatus === 'rejected' && targetStatus === 'inactive') {
    return true;
  }
  
  return false;
}

/**
 * Get available status transitions for tutors
 */
export function getAvailableStatusTransitions(currentStatus: CourseStatus): CourseStatus[] {
  switch (currentStatus) {
    case 'inactive':
      return ['pending']; // Can submit for approval
    case 'active':
      return ['inactive']; // Can deactivate
    case 'rejected':
      return ['inactive']; // Can acknowledge rejection
    case 'pending':
      return []; // Cannot change pending status (only admins can)
    case 'ban':
      return []; // Cannot change banned status (only admins can)
    default:
      return [];
  }
}

/**
 * Get status restriction message for UI display
 */
export function getStatusRestrictionMessage(status: CourseStatus): string {
  switch (status) {
    case 'active':
      return 'This course is active and cannot be modified';
    case 'pending':
      return 'This course is pending approval and cannot be modified';
    case 'inactive':
      return 'This course is inactive and can be modified';
    case 'rejected':
      return 'This course has been rejected and cannot be modified until acknowledged';
    case 'ban':
      return 'This course has been banned and cannot be modified';
    default:
      return 'This course cannot be modified';
  }
}

/**
 * Get status display information
 */
export function getStatusDisplay(status: CourseStatus): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        color: 'text-green-700',
        bgColor: 'bg-green-100'
      };
    case 'pending':
      return {
        label: 'Pending',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100'
      };
    case 'inactive':
      return {
        label: 'Inactive',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100'
      };
    case 'rejected':
      return {
        label: 'Rejected',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100'
      };
    case 'ban':
      return {
        label: 'Banned',
        color: 'text-red-700',
        bgColor: 'bg-red-100'
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100'
      };
  }
}
