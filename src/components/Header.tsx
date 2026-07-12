import styles from './Header.module.css';

interface HeaderProps {
  onLogout: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  return (
    <div className={styles.logoutWrap}>
      <button
        type="button"
        className={`btn btnSecondary ${styles.logout}`}
        onClick={onLogout}
        aria-label="Log out"
      >
        Logout
      </button>
    </div>
  );
}
