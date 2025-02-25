import "../../styles/Navbar.module.scss";
import Link from "next/link";

const Navbar = () => {
  return (
    <nav className="navbar sticky-top navbar-expand-sm navbar-light bg-cream">
      <Link href="/" className="navbar-brand fw-bold">
        <img src="/eventifylogo.png" alt="Logo" style={{ height: "40px" }} />
      </Link>
      <button
        className="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#toggleMobileMenu"
        aria-controls="toggleMobileMenu"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon"></span>
      </button>
      <div className="collapse navbar-collapse navbar-items" id="toggleMobileMenu">
        <div className="navbar-nav">
          <Link href="/events/" className="nav-item nav-link">
            All Events
          </Link>
          <Link href="/tickets" className="nav-item nav-link">
            My Tickets
          </Link>
          <Link href="/events/my-events" className="nav-item nav-link">
            Manage Events
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
