import React from 'react';

interface AssignmentsTabProps {
  classroomId: string;
}

export const AssignmentsTab: React.FC<AssignmentsTabProps> = ({ classroomId }) => {
  return (
    <div>
      <h2>Assignments</h2>
      <p>Classroom ID: {classroomId}</p>
      {/* Add assignment-related content here */}
    </div>
  );
};

export default AssignmentsTab;
