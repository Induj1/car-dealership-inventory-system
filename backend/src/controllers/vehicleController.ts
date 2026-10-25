import type { Request, Response } from 'express';
import type { VehicleService } from '../services/vehicleService.js';
import type { InventoryService } from '../services/inventoryService.js';
import { parseOrThrow, sendSuccess } from '../utils/http.js';
import { UnauthorizedError } from '../utils/errors.js';
import {
  createVehicleSchema,
  purchaseSchema,
  restockSchema,
  searchVehiclesSchema,
  updateVehicleSchema,
} from '../validation/vehicleSchemas.js';

/**
 * HTTP adapter for the catalogue and the inventory.
 *
 * Authorisation is not checked here: the router declares which roles may
 * reach each handler, so the rule is visible in one place rather than buried
 * in a dozen `if (user.role !== ...)` branches.
 */
export class VehicleController {
  constructor(
    private readonly vehicles: VehicleService,
    private readonly inventory: InventoryService,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = parseOrThrow(createVehicleSchema, req.body);

    sendSuccess(res, { vehicle: this.vehicles.create(body) }, 201);
  };

  /**
   * Backs both GET /vehicles and GET /vehicles/search: listing is just a
   * search with no filters, so there is one code path instead of two.
   */
  search = async (req: Request, res: Response): Promise<void> => {
    const query = parseOrThrow(searchVehiclesSchema, req.query);
    const { items, ...meta } = this.vehicles.search(query);

    sendSuccess(res, { vehicles: items }, 200, { ...meta, filters: query });
  };

  filters = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.vehicles.facets());
  };

  findOne = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, { vehicle: this.vehicles.findById(requireId(req)) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const patch = parseOrThrow(updateVehicleSchema, req.body);

    sendSuccess(res, { vehicle: this.vehicles.update(requireId(req), patch) });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    this.vehicles.remove(requireId(req));

    // 204: the deletion succeeded and there is nothing meaningful to return.
    res.status(204).send();
  };

  purchase = async (req: Request, res: Response): Promise<void> => {
    const { quantity } = parseOrThrow(purchaseSchema, req.body ?? {});
    const buyer = requireUser(req);

    sendSuccess(res, this.inventory.purchase(requireId(req), buyer.id, quantity), 201);
  };

  restock = async (req: Request, res: Response): Promise<void> => {
    const { quantity } = parseOrThrow(restockSchema, req.body);

    sendSuccess(res, { vehicle: this.inventory.restock(requireId(req), quantity) });
  };

  myPurchases = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, { purchases: this.inventory.historyFor(requireUser(req).id) });
  };
}

/** Express guarantees the param exists for these routes; this satisfies the types. */
function requireId(req: Request): string {
  return req.params.id ?? '';
}

function requireUser(req: Request): { id: string } {
  if (!req.user) throw new UnauthorizedError('Authentication required');

  return req.user;
}
