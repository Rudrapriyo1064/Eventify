import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import axios from "axios";
import styles from "../../styles/Card.module.scss";

import { signers } from "../../components/Contracts";
import { nftaddress } from "../../config";
import InrPrice from "../../components/price/Inr";

export default function EventDetails() {
  const [event, setEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loadingState, setLoadingState] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();
  const eventId = router.query["id"];

  useEffect(() => {
    if (!router.isReady) return;
    loadData();
  }, [router.isReady]);

  async function loadData() {
    const success = await loadEvent();
    if (success) {
      await loadTickets();
    }
    setLoadingState(true);
  }

  async function loadEvent() {
    try {
      if (!Number.isInteger(parseInt(eventId))) {
        throw new Error(`Event ID '${eventId}' is not valid`);
      }

      const { signedMarketContract } = await signers();
      if (!signedMarketContract) {
        throw new Error("Contract not initialized");
      }

      const data = await signedMarketContract.getEvent(eventId);
      if (!data || !data.uri) {
        throw new Error("Invalid event data received");
      }

      const eventUri = await data.uri;
      const eventRequest = await axios.get(eventUri);
      const eventData = eventRequest.data;

      const currEvent = {
        eventId: data.eventId ? data.eventId.toNumber() : 0,
        name: eventData.name || "Unknown Event",
        description: eventData.description || "",
        imageUri: eventData.image || "",
        location: eventData.location || "No location specified",
        startDate: eventData.eventDate || "No date specified",
        owner: data.owner || "",
      };

      setEvent(currEvent);
      return true;
    } catch (error) {
      console.log("Error in loadEvent:", error);
      error.data === undefined
        ? setErr(error.message)
        : setErr(error.data.message);
      return false;
    }
  }

  async function loadTickets() {
    try {
      const { signedMarketContract, signedTokenContract } = await signers();
      if (!signedMarketContract || !signedTokenContract) {
        throw new Error("Contract not initialized");
      }

      const data = await signedMarketContract.getEventTickets(eventId);
      console.log("Raw ticket data:", data);

      if (!Array.isArray(data)) {
        throw new Error("Invalid ticket data received");
      }

      const eventTickets = await Promise.all(
        data.map(async (i) => {
          if (!i) return null;

          try {
            const tokenId = i.tokenId ? i.tokenId.toNumber() : 0;
            const tokenUri = await signedTokenContract.uri(tokenId);
            const ticketRequest = await axios.get(tokenUri);
            const ticketData = ticketRequest.data;

            // Get the actual remaining tickets from contract balance
            const contractBalance = await signedTokenContract.balanceOf(
              signedMarketContract.address,
              tokenId
            );
            const remaining = contractBalance.toNumber();

            const price = i.price ? ethers.utils.formatUnits(i.price.toString(), "ether") : "0";
            const inrPrice = await InrPrice(price);


            return {
              tokenId,
              name: ticketData.name || "Unknown Ticket",
              description: ticketData.description || "",
              price,
              inrPrice,
              limit: i.purchaseLimit ? i.purchaseLimit.toNumber() : 0,

              supply: i.totalSupply ? i.totalSupply.toNumber() : 0,
              remaining,
              add: 0,
            };
          } catch (error) {
            console.error("Error processing ticket:", error);
            return null;
          }
        })
      );

      const validTickets = eventTickets.filter(ticket => ticket !== null);
      setTickets(validTickets);
    } catch (error) {
      console.log("Error in loadTickets:", error);
      error.data === undefined
        ? setErr(error.message)
        : setErr(error.data.message);
    }
  }

  async function buyTicket(tokenId, qty, price) {
    try {
      setLoadingState(false);
      const { signedMarketContract } = await signers();
      if (!signedMarketContract) {
        throw new Error("Contract not initialized");
      }

      const quantity = parseInt(qty);
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error("Invalid quantity");
      }

      const priceInWei = ethers.utils.parseUnits(price.toString(), "ether");
      const totalPrice = priceInWei.mul(quantity);

      console.log("Transaction Parameters:", {
        nftaddress,
        tokenId,
        quantity,
        totalPrice: totalPrice.toString(),
      });

      const transaction = await signedMarketContract.buyTicket(
        nftaddress,
        tokenId,
        quantity,
        { 
          value: totalPrice,
          gasLimit: 500000
        }
      );

      console.log("Transaction sent:", transaction.hash);
      await transaction.wait();
      router.push("/tickets");
    } catch (error) {
      console.log("Detailed error:", error);
      let errorMessage = "Failed to purchase ticket";

      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.data && error.data.message) {
        errorMessage = error.data.message;
      }

      setErr(errorMessage);
      setLoadingState(true);
    }
  }

  // Rest of your component remains exactly the same...
  if (!loadingState) {
    return (
      <div className="container">
        <h1 className="display-1">Loading...</h1>
      </div>
    );
  }

  if (err) {
    return (
      <div className="container">
        <p className="text-danger display-6">{err}</p>
      </div>
    );
  }

  return (
    event && (
      <div className="container justify-content-center align-items-center">
        <section>
          <div className="container justify-content-center align-items-center border-bottom border-secondary">
            <div className="row justify-content-center align-items-center">
              <div className="col-auto text-center card shadow border border-dark rounded-l overflow-scroll m-3 pt-3">
                <img src={event.imageUri} className={styles.cardImgTop} />
                <div className="card-body">
                  <div style={{ maxHeight: "60px", overflow: "auto" }}>
                    <h3 className="card-title text-center">
                      <span className="fw-bold text-primary">{event.name}</span>{" "}
                      - ID: #{event.eventId}
                    </h3>
                  </div>
                  <div style={{ maxHeight: "55px", overflow: "auto" }}>
                    <p className="">{event.description}</p>
                  </div>
                  <div style={{ maxHeight: "40px", overflow: "auto" }}>
                    <p className="">
                      <i className="bi bi-calendar3"></i> {event.startDate}
                    </p>
                  </div>
                  <div style={{ maxHeight: "65px", overflow: "auto" }}>
                    <p className="">
                      <i className="bi bi-geo-alt-fill"></i> {event.location}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="container justify-content-center align-items-center">
            <h1 className="text-center m-3">Available Tickets</h1>
            <div className="row justify-content-center align-items-center">
              {tickets.length > 0 &&
                tickets.map((ticket) => (
                  <div
                    key={ticket.tokenId}
                    className="col-12 border-bottom border-dark d-flex justify-content-between m-3"
                  >
                    <div className="w-50 text-center">
                      <h3>
                        <span className="fw-bold">{ticket.name}</span>
                        {` - ID: #${ticket.tokenId} `}
                      </h3>
                      <div style={{ height: "55px", overflow: "auto" }}>
                        {ticket.description && <h6>{ticket.description}</h6>}
                      </div>
                      <div>
                        <h4 className="text-primary fw-bold">
                          Price: ₹{ticket.inrPrice}
                        </h4>
                        <p className="text-secondary">= {ticket.price} MATIC</p>
                      </div>
                    </div>
                    <div className="w-50 justify-content-center align-items-center text-center">
                      <div className="d-flex justify-content-between">
                        <div className="w-48">
                          <div>
                            <h6>Purchase Limit: {ticket.limit}</h6>
                          </div>

                        </div>
                        <div className="text-center p-2 m-2 bg-primary w-52">
                          <p className="small text-light fw-bold">
                            Tickets Available: {ticket.remaining}
                          </p>
                          <div className="input-group mb-2">
                            <span
                              className="input-group-text d-none d-md-block"
                              id="qty"
                            >
                              Quantity
                            </span>
                            <input
                              className="form-control"
                              type="number"
                              min="1"
                              max={ticket.remaining}
                              aria-label="qty"
                              placeholder="Qty"
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (!isNaN(value) && value > 0 && value <= ticket.remaining) {
                                  ticket.add = value;
                                }
                              }}
                            />
                          </div>
                          <button
                            onClick={() => {
                              ticket.add > 0
                                ? buyTicket(ticket.tokenId, ticket.add, ticket.price)
                                : alert("Please select quantity");
                            }}
                            className="btn btn-sm text-primary"
                            style={{ backgroundColor: "#eee8a9" }}
                            disabled={ticket.remaining <= 0}
                          >
                            {ticket.remaining <= 0 ? "Sold Out" : "Buy Tickets"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              {tickets.length < 1 && (
                <h1 className="display-5 text-center text-secondary">
                  No tickets available for this event
                </h1>
              )}
            </div>
          </div>
        </section>
      </div>
    )
  );
}