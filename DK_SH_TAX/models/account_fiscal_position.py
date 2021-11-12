# -*- coding: utf-8 -*-
from odoo import api, fields, models


class AccountFiscalPosition(models.Model):
    _inherit = "account.fiscal.position"

    second_hand_tax = fields.Boolean(string="Second Hand Tax", copy=False)
