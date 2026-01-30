import React from 'react';

export const CommentBox = ({ onSave }) => {
    const [comment, setComment] = React.useState('');

    const handleSave = () => {
        if (comment.trim()) {
            onSave(comment);
            setComment('');
        }
    };

    return (
        <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Lägg till anteckning
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    className="textarea-minimal"
                    style={{ minHeight: 'auto', padding: '0.5rem 1rem' }}
                    placeholder="T.ex. 'Ringde rekryteraren'..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <button onClick={handleSave} style={{ whiteSpace: 'nowrap' }}>Spara</button>
            </div>
        </div>
    );
};
