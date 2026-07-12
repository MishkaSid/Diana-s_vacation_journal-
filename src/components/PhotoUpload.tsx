import { useEffect, useId, useRef, useState } from 'react';
import { isAcceptedImageFile, isUnusuallyLarge } from '../utils/imageProcessing';
import styles from './PhotoUpload.module.css';

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
  large: boolean;
}

interface PhotoUploadProps {
  uploading: boolean;
  progress: { done: number; total: number };
  onUpload: (files: File[]) => Promise<unknown>;
}

export function PhotoUpload({ uploading, progress, onUpload }: PhotoUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      pending.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
    // Only revoke on unmount; individual removals revoke themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const nextMessages: string[] = [];
    const accepted: PendingFile[] = [];

    for (const file of files) {
      if (!isAcceptedImageFile(file)) {
        nextMessages.push(`Rejected unsupported file: ${file.name}`);
        continue;
      }
      const large = isUnusuallyLarge(file);
      if (large) {
        nextMessages.push(
          `${file.name} is unusually large and will be compressed before saving.`,
        );
      }
      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        large,
      });
    }

    setMessages(nextMessages);
    setPending((prev) => [...prev, ...accepted]);
  };

  const removePending = (id: string) => {
    setPending((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearPending = () => {
    setPending((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  };

  const handleSave = async () => {
    if (pending.length === 0) return;
    const files = pending.map((item) => item.file);
    await onUpload(files);
    clearPending();
    setMessages([]);
  };

  return (
    <section
      className={`${styles.zone} ${dragActive ? styles.zoneActive : ''}`}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragActive(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
      }}
      aria-label="Photo upload area"
    >
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Upload photos</h3>
          <p className={styles.hint}>
            JPG, JPEG, PNG, or WebP. Drag and drop or choose files.
          </p>
        </div>
        <button
          type="button"
          className="btn btnSecondary"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          Choose files
        </button>
        <input
          ref={inputRef}
          id={inputId}
          className={styles.fileInput}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div className={`notice ${styles.notice}`}>
        Uploaded photos are saved locally on this device.
      </div>

      {messages.length > 0 ? (
        <div className={styles.warnings} role="status">
          {messages.map((message) => (
            <p key={message} className={styles.warning}>
              {message}
            </p>
          ))}
        </div>
      ) : null}

      {pending.length > 0 ? (
        <>
          <div className={styles.previews}>
            {pending.map((item) => (
              <div key={item.id} className={styles.preview}>
                <img src={item.previewUrl} alt={`Preview of ${item.file.name}`} />
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Remove ${item.file.name}`}
                  onClick={() => removePending(item.id)}
                  disabled={uploading}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className="btn btnPrimary"
              onClick={() => void handleSave()}
              disabled={uploading}
            >
              {uploading
                ? `Saving ${progress.done}/${progress.total}…`
                : `Save ${pending.length} photo${pending.length === 1 ? '' : 's'}`}
            </button>
            <button
              type="button"
              className="btn btnGhost"
              onClick={clearPending}
              disabled={uploading}
            >
              Clear
            </button>
          </div>
        </>
      ) : null}

      {uploading ? (
        <p className={styles.progress} role="status">
          Processing and saving photos… {progress.done}/{progress.total}
        </p>
      ) : null}
    </section>
  );
}
