# -*- coding: utf-8 -*-

from odoo import api, fields, models


class Picking(models.Model):
    _inherit = "stock.picking"

    def button_validate(self):
        # update taxes on the lot on validating reciept order
        res = super().button_validate()
        for line in self.move_ids_without_package:
            if line.lot_ids and line.tax_code:
                for lot in line.lot_ids:
                    lot.tax_ids = [(6, 0, line.tax_code.ids)]
        return res