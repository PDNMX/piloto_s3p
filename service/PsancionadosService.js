'use strict';

var _ = require('underscore');
var ObjectId = require('mongoose').Types.ObjectId;
var { Psancionados } = require('../utils/models');
function diacriticSensitiveRegex(string = '') {
  string = string.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return string.replace(/a/g, '[a,á,à,ä]')
      .replace(/e/g, '[e,é,ë]')
      .replace(/i/g, '[i,í,ï]')
      .replace(/o/g, '[o,ó,ö,ò]')
      .replace(/u/g, '[u,ü,ú,ù]')
      .replace(/A/g, '[a,á,à,ä]')
      .replace(/E/g, '[e,é,ë]')
      .replace(/I/g, '[i,í,ï]')
      .replace(/O/g, '[o,ó,ö,ò]')
      .replace(/U/g, '[u,ü,ú,ù]')
}

/**
 * Dependencias donde se cometió la sanción
 *
 * returns dependencias
 **/
async function getDependencias (){
  let dependencias = await Psancionados.find({institucionDependencia : {$exists: true }}).distinct('institucionDependencia').exec();
  return dependencias;
}

/**
 * Muestra los particulares sancionados permitiendo búsquedas avanzadas.
 *
 * body ReqParticularesSancionados JSON para peticiones de busqueda avanzada.
 * returns resParticularesSancionados
 **/

async function post_psancionados (body) {
  let sortObj = body.sort  === undefined ? {} : body.sort;
  let page = body.page;  //numero de papostgina a mostrar
  let pageSize = body.pageSize;
  let query = body.query === undefined ? {} : body.query;
  let select = {
    'particularSancionado.rfc':0,
    'particularSancionado.directorGeneral.curp':0,
    'particularSancionado.apoderadoLegal.curp':0,
  }

  if(page <= 0 ){
    throw new RangeError("Error campo page fuera de rango");
  }else{
    let newQuery= {};
    let newSort={};

    for (let [key, value] of Object.entries(sortObj)) {
      if(key === "nombreRazonSocial" || key === "rfc"){
        newSort["particularSancionado."+key] = value;
      }else if(key === "institucionDependencia"){
        newSort[key+".nombre"]= value
      }else{
        newSort[key]= value;
      }
    }

    for (let [key, value] of Object.entries(query)) {
      if(key === "id"){
        if((value.trim().length || 0) > 0){
          if(ObjectId.isValid(value)){
            newQuery["_id"] = value;
          }else{
            newQuery["_id"] = null;
          }
        }
      }else if( key === "rfc"){
        newQuery["particularSancionado."+key] = { $regex : value,  $options : 'i'}

      }else if(key === "nombreRazonSocial"){
          newQuery["particularSancionado."+key] = { $regex : diacriticSensitiveRegex(value),  $options : 'i'}

      }else if(key === "institucionDependencia"){
        newQuery[key+".nombre"]={ $regex : diacriticSensitiveRegex(value),  $options : 'i'}
      }else if(key === "expediente") {
        newQuery[key] = {$regex: value, $options: 'i'}

      }else if (key === "tipoSancion") {
        if (value.length > 0) {
          newQuery[key + ".clave"] = {$in: value};
        }
      }else if(key === "tipoPersona") {
        newQuery["particularSancionado."+key] = { $regex : value,  $options : 'i'};

      }else {
        newQuery[key]= value;
      }
    }
    //console.log(newQuery);
    if(pageSize <= 200 && pageSize >= 1){
      let paginationResult  = await Psancionados.paginate(newQuery,{page :page , limit: pageSize, sort: newSort, select: select, collation:{locale:'es'}}).then();
      let objpagination ={hasNextPage : paginationResult.hasNextPage, page:paginationResult.page, pageSize : paginationResult.limit, totalRows: paginationResult.totalDocs }
      let objresults = paginationResult.docs;

      try {
        var strippedRows = _.map(objresults, function (row) {
          let rowExtend=  _.extend({id: row._id} , row.toObject());
          return _.omit(rowExtend, '_id');
        });
      }catch (e) {
        console.log(e);
      }

      let objResponse= {};
      objResponse["pagination"] = objpagination;
      objResponse["results"]= strippedRows;
      return objResponse;

    }else{
      throw new RangeError("Error campo pageSize fuera de rango, el rango del campo es 1..200 ");
    }
  }
}

module.exports.getDependencias = getDependencias;
module.exports.post_psancionados =post_psancionados;
