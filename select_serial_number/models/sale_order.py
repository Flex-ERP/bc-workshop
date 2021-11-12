# -*- coding: utf-8 -*-

from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class SaleOrder(models.Model):
    _inherit = "sale.order"

    lot_ids = fields.Many2many('stock.production.lot', string="Lot/Serial Number", copy=False, compute="compute_order_line_lot")

    def compute_order_line_lot(self):
        for record in self:
            lot_list = []
            record.lot_ids = False
            for order_line in record.order_line:
                if order_line.stock_lot_id:
                    lot_list.append(order_line.stock_lot_id.id)
            if lot_list:
                record.lot_ids = lot_list

    def action_confirm(self):
        res = super(SaleOrder, self).action_confirm()
        if self.picking_ids:
            for picking in self.picking_ids:
                for move in picking.move_ids_without_package:
                    order_line_id = self.env['sale.order.line'].search(
                        [('order_id', '=', self.id), ('product_id', '=', move.product_id.id)])
                    if order_line_id and order_line_id.stock_lot_id:
                        if order_line_id.product_tracking == 'lot' or order_line_id.product_tracking == 'serial':
                            move.write(
                                {'lot_id': order_line_id.stock_lot_id.id})
                            # move.write({'lot_id': order_line_id.stock_lot_id.id, 'tax_code': [(6, 0, order_line_id.tax_id.ids)]})
        return res


class SaleOrderLine(models.Model):
    _inherit = "sale.order.line"

    stock_lot_id = fields.Many2one(
        'stock.production.lot', string="Lot", copy=False)
    lot_id = fields.Char(string="Lot/Serial", copy=False)
    product_tracking = fields.Selection(related="product_id.tracking")

    @api.onchange('product_id', 'lot_id', 'product_uom_qty')
    def onchange_lot_number(self):
        if self.product_id:
            if self.product_tracking == 'lot' or self.product_tracking == 'serial':
                if self.lot_id:
                    check_lot_ids = self.env['stock.production.lot'].search(
                        [('name', '=', self.lot_id)])
                    if check_lot_ids:
                        if any(lot.product_id.id == self.product_id.id for lot in check_lot_ids):
                            for lot in check_lot_ids.filtered(lambda lot: lot.product_id.id == self.product_id.id):
                                if lot.product_id.id == self.product_id.id:
                                    if self.product_uom_qty and self.product_uom_qty > 1:
                                        raise ValidationError(_('You cannot enter quantity greater than 1.'))
                                    if self.product_uom_qty > lot.product_qty:
                                        raise ValidationError(
                                            _('This product is not in stock.'))
                                    else:
                                        if lot.id in self.order_id.lot_ids.ids:
                                            raise ValidationError(_('Given Lot Number already exist with same product.'))
                                        if lot and lot.tax_ids:
                                            self.tax_id = [
                                                (6, 0, lot.tax_ids.ids)]
                                            # self.order_id.lot_ids = [
                                            #     (6, 0, lot.id)]
                                            self.stock_lot_id = lot.id
                                else:
                                    raise ValidationError(
                                        _('This product does not exist in the given Lot Number.'))
                        else:
                            raise ValidationError(
                                _('This product does not exist in the given Lot Number.'))
                    else:
                        raise ValidationError(
                            _('Please enter a valid Serial Number.'))
        else:
            self.lot_id = False
            self.stock_lot_id = False

    @api.depends('product_uom_qty', 'discount', 'price_unit', 'tax_id', 'lot_id')
    def _compute_amount(self):
        """
        Compute the amounts of the SO line.
        """
        for line in self:
            price = line.price_unit * (1 - (line.discount or 0.0) / 100.0)
            new_price = price
            if line.lot_id and line.product_id.tracking in ['lot','serial']:
                lot_id = self.env['stock.production.lot'].search([('name', '=', line.lot_id), ('product_id', '=', line.product_id.id)])
                if lot_id.tax_ids.filtered(lambda tax: tax.amount_type == 'based_on_margin'):
                    if lot_id.cost_price:
                        new_price -= lot_id.cost_price
            sh_tax = line.tax_id.filtered(lambda tax: tax.amount_type =='based_on_margin').compute_all(new_price, line.order_id.currency_id, line.product_uom_qty, product=line.product_id, partner=line.order_id.partner_shipping_id)
            taxes = line.tax_id.filtered(lambda tax: tax.amount_type !='based_on_margin').compute_all(price, line.order_id.currency_id, line.product_uom_qty, product=line.product_id, partner=line.order_id.partner_shipping_id)
            print(taxes)
            line.update({
                'price_tax': sum(t.get('amount', 0.0) for t in taxes.get('taxes', [])) + sum(t.get('amount', 0.0) for t in sh_tax.get('taxes', [])),
                'price_total': taxes['total_included'],
                'price_subtotal': taxes['total_excluded'],
            })
            if self.env.context.get('import_file', False) and not self.env.user.user_has_groups('account.group_account_manager'):
                line.tax_id.invalidate_cache(['invoice_repartition_line_ids'], [line.tax_id.id])

