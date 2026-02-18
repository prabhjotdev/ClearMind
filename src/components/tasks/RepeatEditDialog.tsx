import React from 'react';
import './RepeatEditDialog.css';

export type RepeatEditChoice = 'this' | 'all_future' | 'stop';

interface RepeatEditDialogProps {
  taskName: string;
  onChoice: (choice: RepeatEditChoice) => void;
  onCancel: () => void;
}

export default function RepeatEditDialog({
  taskName,
  onChoice,
  onCancel,
}: RepeatEditDialogProps) {
  return (
    <div className="repeat-edit-dialog">
      <div className="repeat-edit-dialog-header">
        <span className="task-form-handle" aria-hidden="true" />
      </div>

      <h3 className="repeat-edit-dialog-title">Edit Repeating Task</h3>
      <p className="repeat-edit-dialog-text">
        "{taskName}" is a repeating task. What would you like to do?
      </p>

      <div className="repeat-edit-dialog-options">
        <button
          className="repeat-edit-dialog-btn"
          onClick={() => onChoice('this')}
        >
          <span className="repeat-edit-dialog-btn-icon" aria-hidden="true">📝</span>
          <div>
            <strong>Edit this task only</strong>
            <p>Changes apply to this occurrence only</p>
          </div>
        </button>

        <button
          className="repeat-edit-dialog-btn"
          onClick={() => onChoice('all_future')}
        >
          <span className="repeat-edit-dialog-btn-icon" aria-hidden="true">📋</span>
          <div>
            <strong>Edit all future tasks</strong>
            <p>Changes apply to this and all future occurrences</p>
          </div>
        </button>

        <button
          className="repeat-edit-dialog-btn repeat-edit-dialog-btn--danger"
          onClick={() => onChoice('stop')}
        >
          <span className="repeat-edit-dialog-btn-icon" aria-hidden="true">🛑</span>
          <div>
            <strong>Stop repeating</strong>
            <p>Keep this task, remove all future occurrences</p>
          </div>
        </button>
      </div>

      <button className="repeat-edit-dialog-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
