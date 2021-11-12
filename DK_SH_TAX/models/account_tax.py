# -*- coding: utf-8 -*-
from odoo import api, fields, models


class AccountTax(models.Model):
    _inherit = "account.tax"

    amount_type = fields.Selection(selection_add=[(
        'based_on_margin', 'Based on Margin')], ondelete={'based_on_margin': 'set default'})

    def _compute_amount(self, base_amount, price_unit, quantity=1.0, product=None, partner=None):
        """added calculation for margin amount_type"""
        if self.amount_type == 'based_on_margin':
            return base_amount * self.amount / 100
        return super()._compute_amount(base_amount, price_unit, quantity, product, partner)


