# -*- coding: utf-8 -*-

from odoo import api, fields, models


class StockProductionLot(models.Model):
    _inherit = "stock.production.lot"

    tax_ids = fields.Many2many('account.tax', string="Taxes", copy=False)

    def get_lot_taxes(self, product, lot):
        lot_ids = self.search([('name', '=', lot[0])])
        response_msg = []
        if lot_ids:
            if any(lot.product_id.id == product[0] for lot in lot_ids):
                for lot in lot_ids.filtered(lambda lot: lot.product_id.id == product[0]):
                    product_uom_qty = 1
                    if product_uom_qty > lot.product_qty:
                        response_msg.append(
                            {'msg': 'This product is not in stock.'})
                    else:
                        if lot and lot.tax_ids:
                            for tax in lot.tax_ids:
                                response_msg.append(
                                    {'id': tax.id, 'name': tax.name})
            else:
                response_msg.append(
                    {'msg': 'This product does not exist in the given Lot Number.'})
        else:
            response_msg.append({'msg': 'Please enter a valid Serial Number.'})
        return response_msg

    def lot_cost_price(self, product, lot):
        cost_price = 0
        lot_id = self.search([('name', '=', lot[0]), ('product_id', '=', product[0])])
        if lot_id:
            cost_price = lot_id.cost_price
        return cost_price



class StockMove(models.Model):
    _inherit = "stock.move"

    lot_id = fields.Many2one('stock.production.lot',
                             string="Lot/Serial Number")
