import React from 'react';

interface MembersTabProps {
  classroomId: string;
}

export const MembersTab: React.FC<MembersTabProps> = ({ classroomId }) => {
  return (
    <div>
      <h2>Members</h2>
      <p>Classroom ID: {classroomId}</p>
      {/* Add members-related content here */}
    </div>
  );
};

export default MembersTab;
