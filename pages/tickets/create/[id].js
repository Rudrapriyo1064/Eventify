import { ethers } from "ethers";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";

import MaticPrice from "../../../components/price/Matic";
import { nftaddress } from "../../../config";
import { signers } from "../../../components/Contracts";
import { positiveInt } from "../../../components/Validation";

export default function createTicket() {
  const [err, setErr] = useState("");
  const [loadingState, setLoadingState] = useState(false);
  const [formInput, updateFormInput] = useState({
    name: "",
    description: "",
    price: "",
    priceMATIC: "0",
    purchaseLimit: "",
    amount: "",
  });
  const [eventName, setEventName] = useState("");
  const [eventPic, setEventPic] = useState("");
  const router = useRouter();
  const eventId = router.query["id"];

  useEffect(() => {
    if (!router.isReady) return;
    loadData();
    setLoadingState(true);
  }, [router.isReady]);

  async function loadData() {
    let eventData = "";
    try {
      const signedContracts = await signers();
      const { signedMarketContract, signer } = signedContracts;
      if (!Number.isInteger(parseInt(eventId))) {
        throw new Error("Event ID used to create ticket was not valid");
      }
      const data = await signedMarketContract.getEvent(eventId);
      const eventUri = await data.uri;
      const address = await signer.getAddress();
      if (!eventUri) {
        throw new Error("Could not find Event URI");
      } else if (data.owner !== address) {
        throw new Error("You do not own the event that you are trying to create a ticket for");
      }

      const eventRequest = await axios.get(eventUri);
      eventData = eventRequest.data;
      setEventName(eventData.name);
      setEventPic(eventData.image);
    } catch (error) {
      console.log(error);
      setErr(error.message || "Failed to load event data");
    }
    setLoadingState(true);
  }

  async function getPlaceholderImage() {
    const imageOriginUrl = eventPic;
    const r = await fetch(imageOriginUrl);
    if (!r.ok) {
      throw new Error(`Error fetching image: [${r.status}]: ${r.statusText}`);
    }
    return r.blob();
  }

  async function uploadToIPFS() {
    const {
      name,
      description,
      price,
      priceMATIC,
      purchaseLimit,
      amount,
    } = formInput;

    if (!name || !price || !amount || !purchaseLimit) {
      throw new Error("Please check you have completed all fields");
    }
    positiveInt([amount, purchaseLimit]);
    if (amount < 1) {
      throw new Error("Number of tickets to be created must be higher than 0");
    }
    if (!(price >= 0)) {
      throw new Error("Please ensure price is a positive number");
    }

    try {
      const imageBlob = await getPlaceholderImage();
      const imageFormData = new FormData();
      imageFormData.append('file', imageBlob);

      const imageResponse = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`
          },
          body: imageFormData
        }
      );

      if (!imageResponse.ok) {
        throw new Error('Failed to upload image to Pinata');
      }

      const imageData = await imageResponse.json();
      const imageUrl = `https://gateway.pinata.cloud/ipfs/${imageData.IpfsHash}`;

      const metadata = {
        name,
        description,
        image: imageUrl,
        properties: {
          price: priceMATIC,
          eventId,
          purchaseLimit,
        },
      };

      const metadataResponse = await fetch(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(metadata)
        }
      );

      if (!metadataResponse.ok) {
        throw new Error('Failed to upload metadata to Pinata');
      }

      const metadataResult = await metadataResponse.json();
      const url = `https://gateway.pinata.cloud/ipfs/${metadataResult.IpfsHash}`;
      return url;
    } catch (error) {
      console.error("Upload error:", error);
      throw new Error(`Failed to upload to Pinata: ${error.message}`);
    }
  }

  async function addTicket() {
    const {
      purchaseLimit,
      amount,
      priceMATIC,
    } = formInput;

    try {
      setLoadingState(false);
      setErr("");

      const getContracts = await signers();
      const { signedMarketContract, signedTokenContract } = getContracts;

      const url = await uploadToIPFS();
      if (!url) {
        throw new Error("Failed to upload to IPFS");
      }

      const ticketPrice = ethers.utils.parseUnits(priceMATIC.toString(), "ether");

      console.log("Creating NFT token...");
      let tokenId = -1;
      const nftTransaction = await signedTokenContract.createToken(url, amount, {
        gasLimit: 500000
      });
      
      console.log("Waiting for NFT transaction...");
      const nftTx = await nftTransaction.wait();
      
      const tokenEvent = nftTx.events.find(event => event.event === "NFTTicketCreated");
      if (!tokenEvent) {
        throw new Error("Failed to get token ID from transaction");
      }
      tokenId = tokenEvent.args.tokenId.toNumber();
      console.log("Token created with ID:", tokenId);

      console.log("Creating market ticket...");
      const marketTransaction = await signedMarketContract.createMarketTicket(
        eventId,
        tokenId,
        nftaddress,
        purchaseLimit,
        amount,
        ticketPrice,
        0,
        0,
        {
          gasLimit: 500000
        }
      );

      console.log("Waiting for market transaction...");
      await marketTransaction.wait();
      
      router.push("/events/my-events");
    } catch (error) {
      console.error("Transaction error:", error);
      
      if (error.code === 4001) {
        setErr("Transaction was rejected by user");
      } else if (error.code === -32603) {
        setErr("Internal JSON-RPC error");
      } else {
        setErr(error.message || "Failed to create ticket. Please try again");
      }
    } finally {
      setLoadingState(true);
    }
  }

  async function updatePrice(value) {
    const maticPrice = await MaticPrice(value);
    updateFormInput({ ...formInput, priceMATIC: maticPrice, price: value });
  }

  if (!loadingState) {
    return <h1 className="container px-20 display-1">Loading...</h1>;
  }

  if (!eventName && err.length > 0) {
    return <p className="container display-6 text-danger">{err}</p>;
  }

  return (
    <div className="container">
      <h1 className="text-center m-4">Create Ticket</h1>
      <p className="display-6 text-center">
        <span className="text-primary fw-bold">{eventName}</span> - ID: #
        {eventId}
      </p>
      <div className="mb-3">
        <label htmlFor="ticketName" className="form-label">
          Ticket Name
        </label>
        <input
          type="text"
          className="form-control"
          id="ticketName"
          onChange={(e) =>
            updateFormInput({ ...formInput, name: e.target.value })
          }
          required
        />
      </div>
      <div className="mb-3">
        <label htmlFor="description" className="form-label">
          Description
        </label>
        <textarea
          id="description"
          className="form-control"
          aria-label="description"
          rows="3"
          onChange={(e) =>
            updateFormInput({ ...formInput, description: e.target.value })
          }
        ></textarea>
      </div>
      <label htmlFor="price" className="form-label">
        Price
      </label>
      <div className="input-group mb-3">
        <span className="input-group-text" id="inr">
          ₹
        </span>
        <input
          type="text"
          className="form-control"
          aria-label="price"
          aria-describedby="inr"
          onChange={(e) => updatePrice(e.target.value)}
          required
        />
      </div>
      <div style={{ marginBottom: "20px" }} className="form-text">
        = {formInput.priceMATIC} MATIC
      </div>
      <div className="mb-3">
        <label htmlFor="limit" className="form-label">
          Purchase Limit
        </label>
        <input
          type="text"
          placeholder="Maximum tickets a buyer can own at once"
          className="form-control"
          id="limit"
          onChange={(e) =>
            updateFormInput({ ...formInput, purchaseLimit: e.target.value })
          }
          required
        />
      </div>
      <div className="mb-3">
        <label htmlFor="amount" className="form-label">
          Number of Tickets
        </label>
        <input
          type="text"
          className="form-control"
          id="amount"
          onChange={(e) =>
            updateFormInput({ ...formInput, amount: e.target.value })
          }
          required
        />
      </div>
      <button
        onClick={addTicket}
        style={{ marginTop: "20px" }}
        className="btn btn-primary"
      >
        Create Tickets
      </button>
      <div>
        <p className="display-6 text-danger">{err}</p>
      </div>
    </div>
  );
}
