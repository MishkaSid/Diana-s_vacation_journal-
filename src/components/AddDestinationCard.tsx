import styles from './AddDestinationCard.module.css';

interface AddDestinationCardProps {
  onClick: () => void;
}

export function AddDestinationCard({ onClick }: AddDestinationCardProps) {
  return (
    <button
      type="button"
      className={styles.card}
      onClick={onClick}
      aria-label="Add a new destination"
    >
      <span className={styles.plus} aria-hidden="true">
        +
      </span>
      <span className={styles.label}>Add a new destination</span>
    </button>
  );
}
