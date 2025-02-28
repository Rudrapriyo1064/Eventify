import Link from "next/link";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import styles from "../../../styles/Card.module.scss";
import axios from "axios";

import {
  signers,
  tokenContract,
  marketContract,
} from '../../../components/Contracts';
import { nftmarketaddress, nftaddress } from '../../../config';
import InrPrice from '../../../components/price/Inr';

export default function adminEvent() {
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

      const { signer, signedMarketContract } = await signers();
      const address = await signer.getAddress();

      const data = await signedMarketContract.getEvent(eventId);
      if (data.owner != address) {
        throw new Error(`You do not not own the Event ID #${eventId}`);
      }
      const eventUri = await data.uri;
      if (!eventUri) {
        throw new Error("Could not find Event URI");
      }
      const eventRequest = await axios.get(eventUri);
      const eventData = eventRequest.data;

      const currEvent = {
        eventId: data.eventId.toNumber(),
        name: eventData.name,
        description: eventData.description,
        imageUri: eventData.image,
        location: eventData.location,
        startDate: eventData.eventDate,
      };

      setEvent(currEvent);
      return true;
    } catch (error) {
      console.log(error);
      error.data === undefined
        ? setErr(error.message)
        : setErr(error.data.message);
      return false;
    }
  }

  async function loadTickets() {
    try {
      const { signedTokenContract, signedMarketContract } = await signers();
      const data = await signedMarketContract.getEventTickets(eventId);
      const eventTickets = await Promise.all(
        data.map(async (i) => {
          const tokenId = i.tokenId.toNumber();
          const tokenUri = await signedTokenContract.uri(tokenId);
          const ticketRequest = await axios.get(tokenUri);
          const ticketData = ticketRequest.data;

          let price = ethers.utils.formatUnits(i.price.toString(), "ether");
          let inrPrice = await InrPrice(price);

          let qty = await signedTokenContract.balanceOf(nftmarketaddress, tokenId);
          let supply = i.totalSupply.toNumber();
          let _ticket = {
            tokenId,
            name: ticketData.name,
            description: ticketData.description,
            price,
            inrPrice,
            limit: i.purchaseLimit.toNumber(),
            supply,
            remaining: qty.toNumber(),
            add: 0,
          };
          return _ticket;
        })
      );
      setTickets(eventTickets);
    } catch (error) {
      console.log(error);
      error.data === undefined
        ? setErr(error.message)
        : setErr(error.data.message);
    }
  }

  async function addTickets(id, qty) {
    setLoadingState(false);
    try {
      const { signedMarketContract, signedTokenContract } = await signers();

      const mintTokensTransaction = await signedTokenContract.addTokens(
        id,
        qty
      );
      await mintTokensTransaction.wait();

      const addTokenToMarketTransaction =
        await signedMarketContract.addMoreTicketsToMarket(nftaddress, id, qty);
      await addTokenToMarketTransaction.wait();
      router.reload();
    } catch (error) {
      console.log(error);
      error.data === undefined
        ? setErr(error.message)
        : setErr(error.data.message);
    }
    setLoadingState(true);
  }

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
          <div className="container justify-content-center align-items-center border-bottom  border-secondary">
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
                  <button
                    style={{ backgroundColor: "#eee8a9" }}
                    className="btn fw-bold text-primary"
                    onClick={() => {
                      router.push(`/events/validate/${event.eventId}`);
                    }}
                  >
                    Validate Tickets{" "}
                    <i className="bi bi-arrow-right-circle-fill"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="container justify-content-center align-items-center">
            <h1 className="text-center m-3">Tickets</h1>
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
                            <h6> Purchase Limit: {ticket.limit}</h6>
                          </div>
                        </div>
                        <div className="text-center p-2 m-2 bg-primary w-52">
                          <p className="small text-light fw-bold">
                            Tickets Supplied: {ticket.supply}
                          </p>
                          {ticket.remaining > 0 ? (
                            <p className="small text-cream fw-bold">
                              Tickets Remaining: {ticket.remaining}
                            </p>
                          ) : (
                            <p className="small text-light fw-bold">
                              Tickets Remaining: {ticket.remaining}
                            </p>
                          )}
                          <div className="input-group mb-2">
                            <span
                              className="input-group-text d-none d-md-block"
                              id="qty"
                            >
                              Add More
                            </span>
                            <input
                              className="form-control"
                              type="text"
                              aria-label="qty"
                              placeholder="Qty"
                              onChange={(e) => (ticket.add = e.target.value)}
                            />
                          </div>
                          <button
                            onClick={() => {
                              ticket.add > 0
                                ? addTickets(ticket.tokenId, ticket.add)
                                : alert("Please select quantity");
                            }}
                            style={{ backgroundColor: "#eee8a9" }}
                            className="btn btn-sm text-primary"
                          >
                            Add Tickets
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
        <div className="text-center">
          <button
            onClick={() => {
              router.push(`/tickets/create/${event.eventId}`);
            }}
            className="btn btn-primary"
          >
            Create New Tickets
          </button>
        </div>

        {err && <p className="text-danger display-6">{err}</p>}
      </div>
    )
  );
}
