import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useRouter } from "next/router";
import { signers } from "../../components/Contracts";
import { isValidImage } from "../../components/Validation";

export default function CreateEvent() {
  const [loading, setLoading] = useState(false);
  const [eventPic, setEventPic] = useState(null);
  const [err, setErr] = useState("");
  const [eventDate, setEventDate] = useState(new Date());
  const [formInput, updateFormInput] = useState({
    name: "",
    description: "",
    address: "",
    postcode: "",
  });
  const router = useRouter();

  function formatDate(date) {
    const oldDate = new Date(date);
    return new Date(
      `${oldDate.getFullYear()}/${oldDate.getMonth() + 1}/${oldDate.getDate()}, 23:59:59`
    );
  }

  async function uploadToPinata(file) {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
    } catch (error) {
      console.error("Pinata Upload Error:", error);
      setErr("Failed to upload image to Pinata");
      return null;
    }
  }

  async function uploadToIPFS() {
    const { name, description, address, postcode } = formInput;
    if (!name || !description || !address || !postcode || !eventDate || !eventPic) {
      setErr("Please fill in all required fields");
      return null;
    }

    const fileUrl = await uploadToPinata(eventPic);
    if (!fileUrl) return null;

    const metadata = {
      name,
      description,
      image: fileUrl,
      location: `${address}, ${postcode}`,
      eventDate: new Date().toISOString().split('T')[0],
    };

    try {
      const response = await fetch(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`
          },
          body: JSON.stringify(metadata)
        }
      );

      if (!response.ok) {
        throw new Error(`Metadata upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
    } catch (error) {
      console.error("Pinata JSON Upload Error:", error);
      setErr("Failed to upload metadata to Pinata");
      return null;
    }
  }

  async function addEvent() {
    setLoading(true);
    setErr("");

    try {
      const signedContracts = await signers();
      const { signedMarketContract } = signedContracts;
      const metadataUrl = await uploadToIPFS();
      if (!metadataUrl) {
        setLoading(false);
        return;
      }

      const transaction = await signedMarketContract.createEvent(
        metadataUrl,
        Math.floor(new Date(eventDate).getTime() / 1000)
      );
      await transaction.wait();
      setLoading(false);
      router.push("/events/my-events");
    } catch (error) {
      console.error(error);
      setErr(error.message || "Event creation failed");
      setLoading(false);
    }
  }

  function handleFileInput(file) {
    if (isValidImage(file.name)) {
      setEventPic(file);
      setErr("");
    } else {
      setEventPic(null);
      setErr("Please upload a JPEG, PNG, or GIF file");
    }
  }

  return (
    <div className="container">
      <h1 className="text-center m-4">Create New Event</h1>
      <div className="mb-3">
        <label htmlFor="eventName" className="form-label">Event Name</label>
        <input
          type="text"
          className="form-control"
          id="eventName"
          onChange={(e) => updateFormInput({ ...formInput, name: e.target.value })}
          required
        />
      </div>
      <div className="mb-3">
        <label htmlFor="description" className="form-label">Description</label>
        <textarea
          id="description"
          className="form-control"
          rows="3"
          onChange={(e) => updateFormInput({ ...formInput, description: e.target.value })}
        ></textarea>
      </div>
      <label htmlFor="eventDate" className="form-label">Date</label>
      <div className="input-group mb-3">
        <DatePicker
          id="eventDate"
          className="form-control"
          selected={eventDate}
          onChange={(date) => setEventDate(formatDate(date))}
          required
        />
      </div>
      <div className="mb-3">
        <label htmlFor="address" className="form-label">Event Address</label>
        <input
          type="text"
          className="form-control"
          id="address"
          onChange={(e) => updateFormInput({ ...formInput, address: e.target.value })}
          required
        />
      </div>
      <div className="mb-3">
        <label htmlFor="postcode" className="form-label">Event Postcode</label>
        <input
          type="text"
          className="form-control"
          id="postcode"
          onChange={(e) => updateFormInput({ ...formInput, postcode: e.target.value })}
          required
        />
      </div>
      <div className="mb-3">
        <label htmlFor="Picture">Event Picture</label>
        <input
          type="file"
          name="Picture"
          className="form-control"
          onChange={(e) => handleFileInput(e.target.files[0])}
        />
      </div>
      {eventPic && (
        <img className="rounded mt-4" width="350" src={URL.createObjectURL(eventPic)} />
      )}
      <button
        type="submit"
        onClick={addEvent}
        className="btn btn-primary"
        style={{ marginTop: "20px" }}
        disabled={loading}
      >
        {loading ? "Creating Event..." : "Create Event"}
      </button>
      {err && <p className="display-6 text-danger">{err}</p>}
    </div>
  );
}