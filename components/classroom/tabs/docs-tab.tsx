import React from 'react';

interface DocsTabProps {
  classroomId: string;
}

export const DocsTab: React.FC<DocsTabProps> = ({ classroomId }) => {
  return (
    <div>
      <h2>Documents</h2>
      <p>Classroom ID: {classroomId}</p>
      {/* Add document-related content here */}
    </div>
  );
};

export default DocsTab;
