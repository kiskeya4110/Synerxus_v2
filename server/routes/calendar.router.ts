import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertCalendarEventSchema } from "@shared/schema";
import { handleValidationError } from "./utils";

export const calendarRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/calendar-events - List all calendar events
calendarRouter.get("/", async (req: Request, res: Response) => {
  try {
    const events = await storage.listCalendarEvents();
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch calendar events" });
  }
});

// GET /api/calendar-events/:id - Get calendar event by ID
calendarRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });
    const event = await storage.getCalendarEvent(eventId);

    if (!event) {
      return res.status(404).json({ message: "Calendar event not found" });
    }

    res.json(event);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch calendar event" });
  }
});

// POST /api/calendar-events - Create new calendar event
calendarRouter.post("/", async (req: Request, res: Response) => {
  try {
    const eventData = insertCalendarEventSchema.parse(req.body);
    const event = await storage.createCalendarEvent(eventData);

    broadcastUpdate("calendar_event_created", event);
    res.status(201).json(event);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// PATCH /api/calendar-events/:id - Update calendar event
calendarRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });
    const eventData = insertCalendarEventSchema.partial().parse(req.body);

    const updatedEvent = await storage.updateCalendarEvent(eventId, eventData);
    if (!updatedEvent) {
      return res.status(404).json({ message: "Calendar event not found" });
    }

    broadcastUpdate("calendar_event_updated", updatedEvent);
    res.json(updatedEvent);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// DELETE /api/calendar-events/:id - Delete calendar event
calendarRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });
    const deleted = await storage.deleteCalendarEvent(eventId);

    if (!deleted) {
      return res.status(404).json({ message: "Calendar event not found" });
    }

    broadcastUpdate("calendar_event_deleted", { id: eventId });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: "Failed to delete calendar event" });
  }
});
