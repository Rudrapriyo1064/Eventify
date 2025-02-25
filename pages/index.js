import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  return (
    <div className="container min-vh-100">
      <div className="row align-items-center min-vh-100 gx-5">
        <div className="col-md-6 text-center text-md-start mb-5 mb-md-0 pe-md-5">
          <h1 className="display-4 fw-bold mb-4">
            NFT Based <span className="text-primary">Tickets</span>
          </h1>
          <p className="lead mb-4 text-muted">
            Experience the future of event ticketing with blockchain technology.
            Secure, transparent, and trustworthy.
          </p>
          <div className="d-flex flex-column flex-md-row gap-3 justify-content-center justify-content-md-start">
            <button
              onClick={() => router.push("/events/create")}
              className="btn btn-primary btn-lg px-4 py-2"
            >
              <i className="bi bi-plus-circle me-2"></i>
              Create Event
            </button>
            <button
              onClick={() => router.push("/events/")}
              className="btn btn-outline-primary btn-lg px-4 py-2"
            >
              <i className="bi bi-search me-2"></i>
              Find Event
            </button>
          </div>
        </div>
        
        <div className="col-md-6 d-none d-md-block ps-md-5">
          <div className="position-relative" style={{ transform: 'scale(1.3)' }}>
            <img 
              className="img-fluid rounded-3 shadow-lg" 
              src="/event.png" 
              alt="Event illustration"
            />
          </div>
        </div>
      </div>
    </div>
  );
}